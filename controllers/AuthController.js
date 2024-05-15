import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AuthController {
  static async getConnect(req, res) {
    let token;
    const usersCollection = dbClient.db.collection('users');
    if (req.header('Authorization') && req.header('Authorization').startsWith('Basic')) {
      // eslint-disable-next-line prefer-destructuring
      token = req.header('Authorization').split(' ')[1];
      const decodedToken = Buffer.from(token, 'base64').toString('ascii');
      const userData = decodedToken.split(':');
      if (userData.length !== 2) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const [email, password] = userData;
      const user = await usersCollection.findOne({ email, password: sha1(password) });
      if (user) {
        const newToken = uuidv4();
        const key = `auth_${newToken}`;
        await redisClient.set(key, user._id.toString(), 60 * 60 * 24);
        res.status(200).json({ token: newToken });
      } else {
        res.status(401).json({ error: 'Unauthorized' });
      }
    }
  }

  static async getDisconnect(req, res) {
    const token = req.header('X-Token');
    const id = await redisClient.get(`auth_${token}`);

    if (id) {
      const usersCollection = dbClient.db.collection('users');
      const user = await usersCollection.findOne({ _id: ObjectId(id) });
      if (user) {
        await redisClient.del(`auth_${token}`);
        res.status(204).send();
      } else {
        res.status(401).json({ error: 'Unauthorized' });
      }
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
  }
}

export default AuthController;
