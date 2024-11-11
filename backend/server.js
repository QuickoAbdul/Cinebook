  // Importation des dépendances
  const express = require('express'); // Framework web pour Node.js
  const redis = require('redis'); // Client Redis
  const bodyParser = require('body-parser'); // Middleware pour parser les corps de requêtes
  const cors = require('cors'); // Middleware pour permettre les requêtes cross-origin
  const bcrypt = require('bcrypt'); // Importer bcrypt pour le hashage du mot de passe
  // Création d'une instance d'Express
  const app = express();

  // Crée une instance du client Redis en se connectant à l'URL fournie
  const redisClient = redis.createClient({
    url: 'redis://default:0FCToz0YgSIw9Zl05Rg1cOzWowPi2rYG@redis-17095.c300.eu-central-1-1.ec2.redns.redis-cloud.com:17095'
  });

  // Gérer les erreurs
  redisClient.on('error', (err) => {
    console.error('Erreur Redis :', err);
  });

  // Connexion à Redis
  redisClient.connect().then(() => {
    console.log('Connecté à Redis');
  }).catch(err => {
    console.error('Erreur lors de la connexion à Redis :', err);
  });

  // Middleware
  app.use(cors());
  app.use(bodyParser.json());
  // Port d'écoute
  const PORT = process.env.PORT || 3001;

  // Message de bienvenue
  app.get('/', (req, res) => {
      res.send('Bienvenue sur le site de réservation de cinéma');
    });

  // Route : Récupérer tous les films
  app.get('/film', async (req, res) => {
    try {
      const movieKeys = await redisClient.keys('film:*'); // Récupérer toutes les clés des films
      const movies = await Promise.all(movieKeys.map(async (key) => {
          const movieData = await redisClient.hGetAll(key); // Utiliser hGetAll pour récupérer les données du film
          console.log(movieData); // Log pour vérifier les données du film
          return movieData;
        }));
      res.json(movies); // Retourner la liste des films en JSON
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de la récupération des films' }); // Gérer les erreurs
    }
  });

  // Route : Récupérer film par ID
  app.get('/film/:id', async (req, res) => {
      try {
          const movieId = req.params.id; // Récupérer l'ID du film depuis l'URL
          const movie = await redisClient.hGetAll(`film:${movieId}`);
          console.log(movie);

          // Récupérer les données du film
          if (!movie) {
            return res.status(404).json({ error: 'Film non trouvé' }); // Gérer le cas où le film n'existe pas
          }
          res.json(movie); // Retourner les détails du film en JSON
          } catch (error) {
          res.status(500).json({ error: 'Erreur lors de la récupération du film' }); // Gérer les erreurs
          }
      }
  );

  // Route : Information d'une  séance
  app.get('/session/:id/', async (req, res) => {
    try {
      const sessionId = req.params.id; // Récupérer l'ID de la séance depuis l'URL
      const session = await redisClient.hGetAll(`session:${sessionId}`); // Récupérer les données de la séance

      if (!session) {
        return res.status(404).json({ error: 'Séance non trouvée' }); // Gérer le cas où la séance n'existe pas
      }
      console.log(session);
      res.json(session); // Retourner les détails de la séance en JSON
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de la récupération des places' }); // Gérer les erreurs
    }
  });

  // Route : Récupérer toutes les séances d'un film
  app.get('/film/:id/sessions', async (req, res) => {
      try {
          const filmId = req.params.id; // Récupérer l'ID du film depuis l'URL

          // Récupérer toutes les clés de séance
          const sessionKeys = await redisClient.keys('session:*');
          
          // Filtrer les séances qui correspondent au filmId
          const sessions = await Promise.all(sessionKeys.map(async (key) => {
              const session = await redisClient.hGetAll(key);
              if (session.film_id === filmId) {
                  return session; // Retourner uniquement les séances pour ce film
              }
          }));

          // Filtrer les valeurs undefined et retourner la liste des séances
          const filteredSessions = sessions.filter(session => session !== undefined);

          res.json(filteredSessions); // Retourner la liste des séances en JSON
      } catch (error) {
          console.error(error);
          res.status(500).json({ error: 'Erreur lors de la récupération des séances.' });
      }
  });

  // Route : Récupérer toutes les séances d'un film
  app.get('/session/:id', async (req, res) => {
    try {
        const filmId = req.params.id; // Récupérer l'ID du film depuis l'URL

        // Récupérer toutes les clés de séance
        const sessionKeys = await redisClient.keys('session:*');
        
        // Filtrer les séances qui correspondent au filmId
        const sessions = await Promise.all(sessionKeys.map(async (key) => {
            const session = await redisClient.hGetAll(key);
            if (session.film_id === filmId) {
                return session; // Retourner uniquement les séances pour ce film
            }
        }));

        // Filtrer les valeurs undefined et retourner la liste des séances
        const filteredSessions = sessions.filter(session => session !== undefined);

        res.json(filteredSessions); // Retourner la liste des séances en JSON
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la récupération des séances.' });
    }
  });

  // Route : Récupérer les réservations d'un utilisateur
  app.get('/user/:id/reservations', async (req, res) => {
    try {
      const userId = req.params.id;

      // Récupérer les informations de l'utilisateur
      const user = await redisClient.hGetAll(`user:${userId}`);
      if (!user || Object.keys(user).length === 0) {
        return res.status(404).json({ error: 'Utilisateur non trouvé.' });
      }

      // Récupérer les réservations de l'utilisateur
      const reservations = JSON.parse(user.reservations || '[]');
      
      res.status(200).json({ reservations });
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de la récupération des réservations.' });
    }
  });

  // Route : Ajouter une réservation pour une séance
app.post('/session/:id/book', async (req, res) => { 
  try {
      const sessionId = req.params.id; // ID de la séance
      const { userId, numberOfSeats } = req.body; // ID de l'utilisateur et nombre de places à réserver

      if (!userId || !numberOfSeats) {
          return res.status(400).json({ error: 'ID utilisateur et nombre de places requis.' });
      }

      // Récupérer les détails de la séance
      const session = await redisClient.hGetAll(`session:${sessionId}`);
      if (!session || Object.keys(session).length === 0) {
          return res.status(404).json({ error: 'Séance non trouvée.' });
      }

      // Vérifier le nombre de places disponibles
      if (parseInt(session.available_seats) >= numberOfSeats) {
          // 1. Mise à jour des places disponibles
          await redisClient.hIncrBy(`session:${sessionId}`, 'available_seats', -numberOfSeats);

          // Récupérer la nouvelle valeur de available_seats après décrémentation
          const updatedSeats = await redisClient.hGet(`session:${sessionId}`, 'available_seats');

          // Date et heure actuelles d'enregistrement de la reservation
          const reservationDateTime = new Date().toISOString();

          // 2. Enregistrer la réservation pour cette session
          const currentReservations = JSON.parse(session.reserved_seats || '[]');
          currentReservations.push({ userId, numberOfSeats, reservationDateTime });
          await redisClient.hSet(`session:${sessionId}`, 'reserved_seats', JSON.stringify(currentReservations));

          // 3. Ajouter la réservation dans les données de l'utilisateur
          const userKey = `user:${userId}`;
          const user = await redisClient.hGetAll(userKey);
          if (!user || Object.keys(user).length === 0) {
              return res.status(404).json({ error: 'Utilisateur non trouvé' });
          }
          const userReservations = JSON.parse(user.reservations || '[]');
          userReservations.push({ sessionId, numberOfSeats });
          await redisClient.hSet(userKey, 'reservations', JSON.stringify(userReservations));

          // 4. Enregistrer la réservation dans la table "réservations"
          const reservationId = `reservation:${Date.now()}`; // Générer un ID unique pour la réservation
          await redisClient.hSet(reservationId, {
              user_id: userId,
              session_id: sessionId,
              seats_reserved: numberOfSeats,
              reservation_date: reservationDateTime, 
          });

          // 5. Publier une notification pour la réservation
          movietitle = await redisClient.hGet(`film:${session.film_id}`, 'title');

          // Vérifie si la séance est pleine après la mise à jour
          if (parseInt(updatedSeats) === 0) { // Si après réservation il n'y a plus de places
              redisClient.publish('notifications', `La séance ${movietitle} est maintenant pleine.`);
          }

          // Réponse de succès
          res.status(200).json({ success: true });
      } else {
          res.status(400).json({ error: 'Pas assez de places disponibles' });
      }
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erreur lors de la réservation' });
  }
});


  // Route : Ajouter un film (pour l'administrateur)
  app.post('/admin/film', async (req, res) => {
      try {
        const { title, description, duration, release_date, sessions } = req.body;
    
        // Validation des données reçues
        if (!title || !description || !duration || !release_date) {
          return res.status(400).json({ error: 'Tous les champs sont obligatoires.' });
        }
    
        const filmId = `film:${Date.now()}`; // Génère un ID unique pour le film basé sur le timestamp
    
        // Enregistrement des détails du film dans Redis
        await redisClient.hSet(filmId, {
          title,
          description,
          duration,
          release_date,
      });
    
        res.status(201).json({ success: true, filmId, message: 'Film ajouté avec succès !' });
      } catch (error) {
        res.status(500).json({ error: 'Erreur lors de l\'ajout du film.' });
      }
    });

  // Route : Ajouter une séance (pour l'administrateur)
  app.post('/admin/session', async (req, res) => {
      try {
          const { filmId, date, time, room, totalSeats } = req.body; // Détails de la séance

          // Validation des données reçues
          if (!filmId || !date || !time || !room || !totalSeats) {
              return res.status(400).json({ error: 'Tous les champs sont obligatoires.' });
          }

          const sessionId = `session:${Date.now()}`; // Générer un ID unique pour la séance

          // Enregistrement des détails de la séance dans Redis
          await redisClient.hSet(sessionId, {
              film_id: filmId,
              date,
              time,
              room,
              total_seats: totalSeats,
              available_seats: totalSeats, 
              reserved_seats: JSON.stringify([]) 
          });

          res.status(201).json({ success: true, sessionId, message: 'Séance ajoutée avec succès !' });
      } catch (error) {
          console.error(error);
          res.status(500).json({ error: 'Erreur lors de l\'ajout de la séance.' });
      }
  });

  app.post('/register', async (req, res) => {
    try {
      const { username, email, password } = req.body;

      // Validation des données d'entrée
      if (!username || !email || !password) {
        return res.status(400).json({ error: 'Tous les champs sont obligatoires.' });
      }

      // Vérifier si l'email existe déjà via la table d'index des emails
      const existingUserIdByEmail = await redisClient.get(`email:${email}`);
      if (existingUserIdByEmail) {
        return res.status(400).json({ error: 'Un utilisateur avec cet email existe déjà.' });
      }

      // Vérifier si l'username existe déjà via la table d'index des usernames
      const existingUserIdByUsername = await redisClient.get(`username:${username}`);
      if (existingUserIdByUsername) {
        return res.status(400).json({ error: 'Ce nom d\'utilisateur est déjà pris.' });
      }

      // Hacher le mot de passe
      const hashedPassword = await bcrypt.hash(password, 10); // Le "10" est le nombre de rounds pour le hachage

      const userId = `user:${Date.now()}`; // Générer un ID unique pour l'utilisateur

      // Enregistrer l'utilisateur dans Redis
      await redisClient.hSet(userId, {
        username,
        email,
        password: hashedPassword, 
        reservations: JSON.stringify([]) 
      });

      // Enregistrer l'email et le username dans les tables d'index
      await redisClient.set(`email:${email}`, userId);
      await redisClient.set(`username:${username}`, userId);

      res.status(201).json({ success: true, message: 'Utilisateur enregistré avec succès.' });
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de l\'inscription de l\'utilisateur.' });
    }
  });

  // Route : Connexion d'un utilisateur
  app.post('/login', async (req, res) => {
    console.log('Requête reçue:', req.body); 

    try {
      const { identifier, password } = req.body; // L'identifiant peut être un email ou un username

      if (!identifier || !password) {
        return res.status(400).json({ success:false, error: 'L\'identifiant et le mot de passe sont requis.' });
      }

      // Vérifier si l'identifiant est un email ou un username
      let userId;
      if (identifier.includes('@')) {
        // Si l'identifiant est un email
        userId = await redisClient.get(`email:${identifier}`);
      } else {
        // Si l'identifiant est un username
        userId = await redisClient.get(`username:${identifier}`);
      }

      if (!userId) {
        return res.status(400).json({ success: false, error: 'Identifiant ou mot de passe incorrect.' });
      }

      // Récupérer les informations de l'utilisateur
      const user = await redisClient.hGetAll(userId);
      console.log(user);

      // Vérifier le mot de passe
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(400).json({ success: false, error: 'Identifiant ou mot de passe incorrect.' });
      }

      res.status(200).json({ success: true, message: 'Connexion réussie.', userId });
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de la connexion.' });
    }
  });
    
  // Démarrer le serveur
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`); // Message pour indiquer que le serveur est en cours d'exécution
  });
