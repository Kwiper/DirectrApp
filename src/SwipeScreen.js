import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Image, Pressable, useWindowDimensions } from 'react-native';
import Swiper from 'react-native-deck-swiper';
import { TMDB_API_KEY, TMDB_IMAGE_BASE, TMDB_BASE_URL, TMDB_MOVIE_GENRES } from './tmdbConfig';
import { auth, db } from './firebaseConfig';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';

// Get array of genre names by ID 
const genreNameById = TMDB_MOVIE_GENRES.reduce((genreLookup, genre) => {
  genreLookup[genre.id] = genre.name;
  return genreLookup;
}, {});

export default function SwipeScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const swiperRef = useRef(null);
  const pageRef = useRef(1);
  const loadingMoreRef = useRef(false);
  const swipedIdsRef = useRef({});

  useEffect(() => {
    const fetchMovies = async (page = 1) => {
      try {
        loadingMoreRef.current = true;
        const user = auth.currentUser;
        const swipedIds = {};
        if (user) {
          try {
            const q = query(collection(db, 'swipes'), where('userId', '==', user.uid));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
              const data = doc.data();
              if (data.movieData && data.movieData.id) {
                swipedIds[data.movieData.id] = true;
              }
            });
            swipedIdsRef.current = swipedIds;
          } catch (error) {
            console.warn(error);
          }
        }
        // Fetch movies
        if (!TMDB_API_KEY) {
          console.warn('TMDB API key is missing. Please add it to tmdbConfig.js');
          return;
        }

        const response = await fetch(
          `${TMDB_BASE_URL}/movie/top_rated?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`
        );
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`HTTP ${response.status}: ${text}`);
        }
        const json = await response.json();
        console.log('fetched movies', json.results?.length);

        // Filter out swiped movies
        const filteredMovies = (json.results || []).filter(movie => !swipedIds[movie.id]);

        pageRef.current = page; // Get current TMDB page so we know which page to load next
        setMovies(filteredMovies);
      } catch (error) {
        console.warn(error);
      } finally {
        loadingMoreRef.current = false;
        setLoading(false);
      }
    };

    fetchMovies(1);
  }, []);

  const loadMoreMovies = async (cardIndex) => {
    if (loadingMoreRef.current || movies.length - cardIndex > 3) return; // Load more movies when there are less than three movies left in the deck

    try {
      loadingMoreRef.current = true;
      const response = await fetch(
        `${TMDB_BASE_URL}/movie/top_rated?api_key=${TMDB_API_KEY}&language=en-US&page=${pageRef.current + 1}`
      );
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      const json = await response.json();
      pageRef.current += 1;
      setMovies((current) => [
        ...current,
        ...(json.results || []).filter((movie) => !swipedIdsRef.current[movie.id]),
      ]);
    } catch (error) {
      console.warn('error loading more movies', error);
    } finally {
      loadingMoreRef.current = false; // Set load state to false
    }
  };

  const renderCard = (movie) => {
    if (!movie) return null;
    const poster = movie.poster_path && `${TMDB_IMAGE_BASE}${movie.poster_path}`;
    const genreNames = Array.isArray(movie.genre_ids) ? movie.genre_ids.map((genreId) => genreNameById[genreId]).filter(Boolean) : [];

    return (
      <View style={styles.card}>
        <View style={styles.cardContent}>
          {poster && (
            <View style={styles.posterFrame}>
              <Image source={{ uri: poster }} style={styles.poster} />
            </View>
          )}
          {!poster && (
            <View style={styles.posterFrame}>
              <View style={styles.noPoster}>
                <Text style={{ color: 'lightgray' }}>No image</Text>
              </View>
            </View>
          )}
          <Text style={styles.cardTitle}>{movie.title}</Text>
          {genreNames.length > 0 && (
            <View style={styles.genreList}>
              {genreNames.map((genreName) => (
                <View key={genreName} style={styles.genreTag}>
                  <Text style={styles.genreTagText}>{genreName}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  const saveSwipe = async (movie, direction) => {
    if (!movie) return;
    const user = auth.currentUser;
    if (!user) {
      console.warn('user not logged in, swipe not saved');
      return;
    }

    try {
      await addDoc(collection(db, 'swipes'), { // Add user, swipe direction, movie data to firebase to read in watchlist
        userId: user.uid,
        movieData: movie,
        direction,
        timestamp: serverTimestamp(),
      });
      swipedIdsRef.current[movie.id] = true;
    } catch (error) {
      console.warn(error);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading movies...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.swiperContainer}>
        <Swiper
          ref={swiperRef}
          cards={movies}
          renderCard={renderCard}
          stackSize={1}
          cardIndex={0}
          cardHorizontalMargin={width * 0.12}
          cardVerticalMargin={0}
          marginTop={0}
          marginBottom={12}
          backgroundColor="transparent"
          showSecondCard={false}
          onSwipedLeft={(cardIndex) => {
            console.log('not interested', cardIndex);
            const movie = movies[cardIndex];
            saveSwipe(movie, 'left');
            loadMoreMovies(cardIndex);
          }}
          onSwipedRight={(cardIndex) => {
            console.log('interested', cardIndex);
            const movie = movies[cardIndex];
            saveSwipe(movie, 'right');
            loadMoreMovies(cardIndex);
          }}
          verticalSwipe={false}
          animateCardOpacity
          onTapCard={(cardIndex) => {
            const movie = movies[cardIndex];
            navigation.navigate('Movie', { movie });
          }}
        />
      </View>
      <View style={styles.swipeButtons}>
        <Pressable
          style={({ pressed }) => [
            styles.rejectButton,
            pressed && styles.swipeButtonPressed,
          ]}
          onPress={() => swiperRef.current?.swipeLeft()}
        >
          <Text style={styles.swipeSymbol}>X</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.acceptButton,
            pressed && styles.swipeButtonPressed,
          ]}
          onPress={() => swiperRef.current?.swipeRight()}
        >
          <Text style={styles.swipeSymbol}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: '#f6f6f6',
  },
  swiperContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  swipeButtons: {
    position: 'absolute',
    bottom: 26,
    left: '12%',
    right: '12%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    zIndex: 10,
    elevation: 10,
  },
  rejectButton: {
    width: 68,
    height: 68,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 4,
    marginBottom: 26,
    backgroundColor: '#a75e58',
  },
  acceptButton: {
    width: 68,
    height: 68,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 4,
    marginBottom: 26,
    backgroundColor: '#2b9e47',
  },
  swipeButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  swipeSymbol: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  card: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  cardContent: {
    width: '100%',
    borderRadius: 18,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 3,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 4,
    paddingBottom: 14,
  },
  posterFrame: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  poster: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
    backgroundColor: '#f5f5f5',
  },
  cardTitle: {
    marginTop: 4,
    fontSize: 18,
    color: '#000',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  noPoster: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  genreList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 8,
    marginTop: 4,
    marginBottom: 6,
  },
  genreTag: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#f5f5f5',
  },
  genreTagText: {
    fontSize: 12,
    color: '#000',
  },
});

