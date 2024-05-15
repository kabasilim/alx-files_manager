import { ObjectId } from 'mongodb';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';
import Queue from 'bull';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class FilesController {
  static async postUpload(req, res) {
    const token = req.header('X-Token');
    const id = await redisClient.get(`auth_${token}`);
    if (!id) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const usersCollection = dbClient.db.collection('users');
    const filesCollection = dbClient.db.collection('files');
    const user = await usersCollection.findOne({ _id: ObjectId(id) });

    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const {
      name, type, data, parentId, isPublic,
    } = req.body;
    const userId = user._id;
    if (!name) {
      res.status(400).json({ error: 'Missing name' });
      return;
    }
    const acceptedTypes = ['folder', 'file', 'image'];
    if (!type || !acceptedTypes.includes(type)) {
      res.status(400).json({ error: 'Missing type' });
      return;
    }

    if (!data && type !== 'folder') {
      res.status(400).json({ error: 'Missing data' });
      return;
    }

    if (parentId) {
      const file = await filesCollection.findOne({ _id: ObjectId(parentId), userId });

      if (!file) {
        res.status(400).json({ error: 'Parent not found' });
        return;
      }
      if (file && file.type !== 'folder') {
        res.status(400).json({ error: 'Parent is not a folder' });
        return;
      }
    }
    const fileData = {
      name,
      userId,
      type,
      parentId: parentId ? ObjectId(parentId) : 0,
      isPublic: isPublic || false,
    };

    if (type === 'folder') {
      const newFile = await filesCollection.insertOne({ ...fileData });
      res.status(201).json({ id: newFile.insertedId, ...fileData });
      return;
    }
    const relativePath = process.env.FOLDER_PATH || '/tmp/files_manager';

    if (!fs.existsSync(relativePath)) {
      fs.mkdirSync(relativePath);
    }
    const localPath = uuidv4();
    const fullPath = `${relativePath}/${localPath}`;
    fs.writeFile(fullPath, data, { encoding: 'base64' }, (err) => {
      if (err) {
        console.log(err);
      }
    });
    const newFile = await filesCollection.insertOne({ ...fileData, localPath: fullPath });
    res.status(201).json({ id: newFile.insertedId, ...fileData });
    if (type === 'image') {
      const queue = new Queue('fileQueue');
      queue.add({ fileId: newFile.insertedId, userId });
    }
  }

  static async getShow(req, res) {
    const token = req.header('X-Token');
    const id = await redisClient.get(`auth_${token}`);
    if (!id) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const usersCollection = dbClient.db.collection('users');
    const user = await usersCollection.findOne({ _id: ObjectId(id) });

    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const fileId = req.params.id;
    const filesCollection = dbClient.db.collection('files');
    const file = await filesCollection.findOne({ _id: ObjectId(fileId), userId: user._id },
      {
        projection: {
          id: '$_id', _id: 0, name: 1, type: 1, isPublic: 1, parentId: 1, userId: 1,
        },
      });
    if (file) {
      res.status(200).json(file);
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  }

  static async getIndex(req, res) {
    const token = req.header('X-Token');
    const id = await redisClient.get(`auth_${token}`);
    if (!id) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const usersCollection = dbClient.db.collection('users');
    const user = await usersCollection.findOne({ _id: ObjectId(id) });

    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { parentId } = req.query;
    const page = req.query.page || 0;
    const filesCollection = dbClient.db.collection('files');
    let filter;

    if (parentId) {
      filter = { parentId: ObjectId(parentId), userId: user._id };
    } else {
      filter = { userId: user._id };
    }
    const resultArray = await filesCollection.aggregate([
      { $match: filter },
      { $skip: parseInt(page, 10) * 20 },
      { $limit: 20 },
      {
        $project: {
          id: '$_id', _id: 0, name: 1, type: 1, isPublic: 1, parentId: 1, userId: 1,
        },
      },
    ]).toArray();
    res.status(200).json(resultArray);
  }

  static async putPublish(req, res) {
    const token = req.header('X-Token');
    const id = await redisClient.get(`auth_${token}`);
    if (!id) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const usersCollection = dbClient.db.collection('users');
    const user = await usersCollection.findOne({ _id: ObjectId(id) });

    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const fileId = req.params.id;
    const filesCollection = dbClient.db.collection('files');
    const update = {
      $set: {
        isPublic: true,
      },
    };
    const fileToUpdate = await filesCollection.findOneAndUpdate(
      { _id: ObjectId(fileId), userId: ObjectId(user._id) }, update,
    );
    if (!fileToUpdate.value) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    const result = { id: fileToUpdate.value._id, ...fileToUpdate.value, isPublic: true };
    delete result.localPath;
    delete result._id;
    res.status(200).json(result);
  }

  static async putUnpublish(req, res) {
    const token = req.header('X-Token');
    const id = await redisClient.get(`auth_${token}`);
    if (!id) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const usersCollection = dbClient.db.collection('users');
    const user = await usersCollection.findOne({ _id: ObjectId(id) });

    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const fileId = req.params.id;
    const filesCollection = dbClient.db.collection('files');
    const update = {
      $set: {
        isPublic: false,
      },
    };
    const fileToUpdate = await filesCollection.findOneAndUpdate(
      { _id: ObjectId(fileId), userId: ObjectId(user._id) }, update,
    );
    if (!fileToUpdate.value) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    const result = { id: fileToUpdate.value._id, ...fileToUpdate.value, isPublic: false };
    delete result.localPath;
    delete result._id;
    res.status(200).json(result);
  }

  static async getFile(req, res) {
    const fileId = req.params.id;
    const filesCollection = dbClient.db.collection('files');
    const file = await filesCollection.findOne({ _id: ObjectId(fileId) });
    if (!file) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    const token = req.header('X-Token');
    const id = await redisClient.get(`auth_${token}`);
    const usersCollection = dbClient.db.collection('users');
    const user = await usersCollection.findOne({ _id: ObjectId(id) });

    if ((!id || !user || file.userId.toString() !== id) && !file.isPublic) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    if (file.type === 'folder') {
      res.status(400).json({ error: "A folder doesn't have content" });
      return;
    }

    if (!fs.existsSync(file.localPath)) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    let path = file.localPath;
    const { size } = req.query;

    if (size) {
      path = `${file.localPath}_${size}`;
    }
    const contentType = mime.contentType(file.name);
    try {
      const data = await fs.promises.readFile(path);
      res.header('Content-Type', contentType).status(200).send(data);
    } catch (err) {
      res.status(404).json({ error: 'Not found' });
    }
  }
}

export default FilesController;
