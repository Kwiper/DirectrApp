import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { auth, db } from './firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { TMDB_IMAGE_BASE } from './tmdbConfig';
import { useIsFocused } from '@react-navigation/native';

export default function WatchlistScreen({ navigation }) {
  const [movies, setMovies] = useState([]);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    const fetchWatchlist = async () => {
      const user = auth.currentUser;
      if (!user) {
        setMovies([]);
        return;
      }

      try {
        const q = query(
          collection(db, 'swipes'),
          where('userId', '==', user.uid),
          where('direction', '==', 'right') // Get movies swiped right and with current user ID
        );
        const snapshot = await getDocs(q);
        const list = snapshot.docs
          .map((doc) => doc.data().movieData)
          .filter(Boolean);
        setMovies(list);
      } catch (error) {
        console.warn(error);
        setMovies([]);
      }
    };

    fetchWatchlist();
  }, [isFocused]);

  const renderItem = ({ item }) => {
    const poster = item.poster_path && `${TMDB_IMAGE_BASE}${item.poster_path}`;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('Movie', { movie: item })}
      >
        {poster && <Image source={{ uri: poster }} style={styles.poster} />}
        {!poster && (
          <View style={styles.noPoster}>
            <Text style={styles.noPosterText}>No image</Text>
          </View>
        )}
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
      </TouchableOpacity>
    );
  };

  if (movies.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No items in your watchlist.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        style={styles.listContent}
        data={movies}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        numColumns={3}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 8,
    backgroundColor: '#f6f6f6',
  },
  list: {
    paddingVertical: 8,
  },
  listContent: {
    flex: 1,
  },
  row: {
    justifyContent: 'flex-start',
    marginBottom: 8,
  },
  card: {
    width: '33.333%',
    alignItems: 'center',
  },
  poster: {
    width: 100,
    height: 150,
    borderRadius: 8,
  },
  cardTitle: {
    marginTop: 4,
    fontSize: 12,
    textAlign: 'center',
    color: '#000',
  },
  noPoster: {
    width: 100,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  noPosterText: {
    color: '#666',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});

