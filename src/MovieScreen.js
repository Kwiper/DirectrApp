import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Alert } from 'react-native';
import * as Location from 'expo-location';
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import { TMDB_API_KEY, TMDB_BACKDROP_IMAGE_BASE, TMDB_BASE_URL, TMDB_MOVIE_GENRES, } from './tmdbConfig';

const genreNameById = TMDB_MOVIE_GENRES.reduce((genreLookup, genre) => {
  genreLookup[genre.id] = genre.name;
  return genreLookup;
}, {});

const defaultCountry = 'CA';

export default function MovieScreen({ route }) {
  const movie = route && route.params ? route.params.movie : null;
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [watchProviders, setWatchProviders] = useState(null);
  const [watchlistDocIds, setWatchlistDocIds] = useState([]);
  const [removingFromWatchlist, setRemovingFromWatchlist] = useState(false);
  const genreNames = movie && Array.isArray(movie.genre_ids) ? movie.genre_ids.map((genreId) => genreNameById[genreId]).filter(Boolean) : [];
  const headerImage = movie?.backdrop_path ? `${TMDB_BACKDROP_IMAGE_BASE}${movie.backdrop_path}` : null;

  useEffect(() => {
    if (!movie?.id) {
      console.warn('Movie details are unavailable.');
      setLoading(false);
      return;
    }

    const fetchDetails = async () => {
      try {
        // Fetch credits
        const creditsResponse = await fetch(
          `${TMDB_BASE_URL}/movie/${movie.id}/credits?api_key=${TMDB_API_KEY}`
        );
        if (!creditsResponse.ok) {
          throw new Error('Failed to fetch credits');
        }
        const credits = await creditsResponse.json();

        const directorNames = credits.crew // Get Director
          .filter((person) => person.job === 'Director')
          .map((person) => person.name)
          .filter(Boolean);
        const castNames = credits.cast // Get top 5 billed cast 
          .slice(0, 5)
          .map((actor) => actor.name)
          .filter(Boolean);

        setDetails({ directorNames, castNames });
      } catch (err) {
        console.warn('failed to fetch movie credits', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [movie?.id]);

  useEffect(() => {
    if (!movie?.id) {
      return;
    }

    const fetchWatchProviders = async () => {
      try {
        const providersPromise = fetch(
          `${TMDB_BASE_URL}/movie/${movie.id}/watch/providers?api_key=${TMDB_API_KEY}`
        );
        const countryPromise = (async () => {
          const { status } = await Location.requestForegroundPermissionsAsync();

          if (status !== 'granted') {
            console.log('Location permission denied');
            return defaultCountry;
          }

          const location = await Location.getCurrentPositionAsync({});
          const { latitude, longitude } = location.coords;
          const geoResponse = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          const geoData = await geoResponse.json();
          return geoData.countryCode || defaultCountry;
        })();

        const [providersResponse, countryCode] = await Promise.all([
          providersPromise,
          countryPromise,
        ]);

        if (providersResponse.ok) {
          const providersData = await providersResponse.json();
          setWatchProviders(providersData.results[countryCode] || null);
        }
      } catch (err) {
        console.log('Error fetching watch providers:', err);
      }
    };

    fetchWatchProviders();
  }, [movie?.id]);

  useEffect(() => {
    if (!movie?.id) {
      setWatchlistDocIds([]);
      return;
    }

    const status = { isActive: true };

    const fetchWatchlistStatus = async () => {
      const user = auth.currentUser;
      if (!user) {
        if (status.isActive) {
          setWatchlistDocIds([]);
        }
        return;
      }

      try {
        const q = query(
          collection(db, 'swipes'),
          where('userId', '==', user.uid),
          where('direction', '==', 'right')
        );
        const snapshot = await getDocs(q);
        const matchingDocIds = snapshot.docs
          .filter((swipeDoc) => swipeDoc.data().movieData?.id === movie.id)
          .map((swipeDoc) => swipeDoc.id);

        if (status.isActive) {
          setWatchlistDocIds(matchingDocIds);
        }
      } catch (error) {
        console.warn(error);
        if (status.isActive) {
          setWatchlistDocIds([]);
        }
      }
    };

    fetchWatchlistStatus();

    return () => {
      status.isActive = false;
    };
  }, [movie?.id]);

  const removeFromWatchlist = async () => {
    if (watchlistDocIds.length === 0 || removingFromWatchlist) {
      return;
    }

    try {
      setRemovingFromWatchlist(true);
      await Promise.all(
        watchlistDocIds.map((watchlistDocId) => updateDoc(doc(db, 'swipes', watchlistDocId), {
          direction: 'left', // Set direction to left to indicate it's no longer in the watchlist, but also makes it so it doesn't show up again in swipe screen
        }))
      );
      setWatchlistDocIds([]);
      Alert.alert('Removed from watchlist', `${movie.title} has been removed from your watchlist.`);
    } catch (error) {
      console.warn('failed to remove movie from watchlist',error);
      Alert.alert('Unable to remove movie', 'Please try again.');
    } finally {
      setRemovingFromWatchlist(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.statusText}>Loading...</Text>
      </View>
    );
  }

  if (!movie?.id) {
    return (
      <View style={styles.container}>
        <Text style={styles.statusText}>Movie details are unavailable.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {headerImage && <Image source={{ uri: headerImage }} style={styles.poster} />}
      <View style={styles.content}>
        <Text style={styles.title}>{movie.title}</Text>
        {genreNames.length > 0 && (
          <View style={styles.genreList}>
            {genreNames.map((genreName) => (
              <View key={genreName} style={styles.genreTag}>
                <Text style={styles.genreTagText}>{genreName}</Text>
              </View>
            ))}
          </View>
        )}
        {watchlistDocIds.length > 0 && (
          <TouchableOpacity
            style={styles.removeButton}
            activeOpacity={0.85}
            onPress={removeFromWatchlist}
            disabled={removingFromWatchlist}
          >
            <Text style={styles.removeButtonText}>
              {removingFromWatchlist ? 'Removing...' : 'Remove from Watchlist'}
            </Text>
          </TouchableOpacity>
        )}
        <Text style={styles.overview}>{movie.overview}</Text>
        {details?.directorNames?.length > 0 && (
          <View style={styles.detailSection}>
            <Text style={styles.label}>Director:</Text>
            <View style={styles.genreList}>
              {details.directorNames.map((directorName) => (
                <View key={directorName} style={styles.genreTag}>
                  <Text style={styles.genreTagText}>{directorName}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        {details?.castNames?.length > 0 && (
          <View style={styles.detailSection}>
            <Text style={styles.label}>Cast:</Text>
            <View style={styles.genreList}>
              {details.castNames.map((castName) => (
                <View key={castName} style={styles.genreTag}>
                  <Text style={styles.genreTagText}>{castName}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        {watchProviders && watchProviders.flatrate && (
          <View style={styles.providersContainer}>
            <Text style={styles.label}>Available on:</Text>
            <View style={styles.genreList}>
              {watchProviders.flatrate.map(provider => (
                <View key={provider.provider_id} style={styles.genreTag}>
                  <Text style={styles.genreTagText}>{provider.provider_name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        {!watchProviders && <Text style={styles.label}>Streaming availability not available</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f6f6',
  },
  poster: {
    width: '100%',
    height: 220,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
  },
  genreList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
    alignSelf: 'flex-start',
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
  removeButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#c62828',
    borderRadius: 24,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  overview: {
    fontSize: 16,
    marginBottom: 16,
    color: '#666',
    lineHeight: 24,
  },
  detailSection: {
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#000',
  },
  providersContainer: {
    marginBottom: 16,
  },
  statusText: {
    color: '#000',
  },
});
