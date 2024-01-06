const express = require('express')
const app = express()
const port = 80
const twig = require('twig');
const bodyParser = require('body-parser');
const mysql = require('mysql');


app.set('view engine','twig');
app.use(express.static('public'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.render("route3")
  })


  const db = mysql.createConnection({
    host: 'localhost',
    user: 'root', 
    password: '12345678', 
    database: 'music', 
    port: 3306,
});

db.connect((err) => {
    if (err) {
        console.error('MySQL bağlantısı hatası: ' + err.stack);
        return;
    }
    console.log('MySQL bağlantısı başarıyla kuruldu');
});



app.post('/getSongs', (req, res, next) => {
    let genre = req.body.genre;
    let artist = req.body.artist;

    let songs;

    if (genre) {
        genre = genre.toLowerCase()
        const query = 'SELECT title FROM songs INNER JOIN artists ON songs.artist_id = artists.artist_id WHERE genre = ?';
       db.query(query, [genre], (err, result) => {
            if (err) {
                console.error('MySQL query error: ' + err.stack);
                res.status(500).json({ error: 'Internal Server Error' });
                return;
            }

            songs = result.map(row => row.title);
            res.json({ songs });
        });
    } else if (artist) {
        artist = artist.toLowerCase();
         const query = 'SELECT title FROM songs INNER JOIN artists ON songs.artist_id = artists.artist_id WHERE name = ?';
       db.query(query, [artist], (err, result) => {
            if (err) {
                console.error('MySQL query error: ' + err.stack);
                res.status(500).json({ error: 'Internal Server Error' });
                return;
            }

            songs = result.map(row => row.title);
            res.json({ songs });
        });
    }
});


app.post('/addSong', (req, res) => {
  const { songTitle, artistName, albumName, genre, duration, releaseDate } = req.body;


  let artistId;
  db.query('INSERT INTO artists (name, genre) VALUES (?, ?) ON DUPLICATE KEY UPDATE artist_id=LAST_INSERT_ID(artist_id)',
    [artistName, genre],
    (error, results) => {
      if (error) throw error;
      artistId = results.insertId;


      let albumId;
      db.query('INSERT INTO albums (title, release_date, artist_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE album_id=LAST_INSERT_ID(album_id)',
        [albumName, releaseDate, artistId],
        (error, results) => {
          if (error) throw error;
          albumId = results.insertId;

                   
          db.query('INSERT INTO songs (title, duration, release_date, artist_id, album_id) VALUES (?, ?, ?, ?, ?)',
            [songTitle, duration, releaseDate, artistId, albumId],
            (error) => {
              if (error) throw error;

           
              res.status(200).send('Song added successfully');
            });
        });
    });
});





app.get('/getLists', (req, res, next) => {
  const listType = req.query.type; // genres, artists, songs
  
  let query;
  
  switch (listType) {
    case 'genres':
      query = 'SELECT DISTINCT a.genre FROM artists a WHERE a.genre IS NOT NULL';
      break;
    case 'artists':
      query = 'SELECT DISTINCT a.name FROM artists a WHERE a.name IS NOT NULL';
      break;
    case 'songs':
      query = 'SELECT DISTINCT songs.title AS song_title, artists.name AS artist_name FROM songs JOIN artists ON songs.artist_id = artists.artist_id';
      break;
    default:
      res.status(400).json({ error: 'Invalid list type' });
      return;
  }

  db.query(query, (err, result) => {
    if (err) {
      console.error('MySQL query error: ' + err.stack);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    const listItems = result.map(row => {
      if (listType === 'songs') {
        return {
          song_title: row.song_title,
          artist_name: row.artist_name
        };
      } else {
        return row[Object.keys(row)[0]];
      }
    });
    
    res.json({ [listType]: listItems });
  });
});

  

app.get('/search', (req, res) => {
  const artistInput = req.query.artist;
  const albumInput = req.query.album;
  const songInput = req.query.song;

  const query = `
    SELECT DISTINCT artists.name AS artist, albums.title AS album, songs.title AS song
    FROM songs
    JOIN artists ON songs.artist_id = artists.artist_id
    JOIN albums ON songs.album_id = albums.album_id
    WHERE
      (? IS NULL OR artists.name LIKE ?) AND
      (? IS NULL OR albums.title LIKE ?) AND
      (? IS NULL OR songs.title LIKE ?)
  `;

  db.query(query, [artistInput, `%${artistInput}%`, albumInput, `%${albumInput}%`, songInput, `%${songInput}%`], (err, results) => {
    if (err) {
      console.error('MySQL query error: ' + err.stack);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    res.json({ results });
  });
});



app.delete('/delete-song', (req, res) => {
  const songName = req.query.name;
console.log(songName);
  db.query('DELETE FROM songs WHERE title = ?', [songName], (error, results) => {
      if (error) {
          console.error('MySQL query error:', error);
          res.status(500).json({ error: 'Internal Server Error' });
      } else {
          res.json({ message: 'Song deleted successfully' });
      }
  }); 
});



  app.listen(port, () => {
    console.log(`listening on port ${port}`)
  })