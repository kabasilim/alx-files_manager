import fs from 'fs';
import Queue from 'bull';
import { ObjectId } from 'mongodb';
import imageThumbnail from 'image-thumbnail';

import dbClient from './utils/db';

const queue = new Queue('fileQueue');
const queue2 = new Queue('userQueue');

queue.process(async (job, done) => {
  const { fileId, userId } = job.data;

  if (!fileId) {
    throw new Error('Missing fileId');
  }
  if (!userId) {
    throw new Error('Missing userId');
  }

  const filesCollection = dbClient.db.collection('files');
  const file = await filesCollection.findOne({ _id: ObjectId(fileId), userId: ObjectId(userId) });
  if (!file) {
    throw new Error('File not found');
  }
  const thumbnail500 = await imageThumbnail(file.localPath, { width: 500 });
  const thumbnail250 = await imageThumbnail(file.localPath, { width: 250 });
  const thumbnail100 = await imageThumbnail(file.localPath, { width: 100 });

  fs.writeFile(`${file.localPath}_500`, thumbnail500, (err) => {
    if (err) {
      throw err;
    }
  });
  fs.writeFile(`${file.localPath}_250`, thumbnail250, (err) => {
    if (err) {
      throw err;
    }
  });
  fs.writeFile(`${file.localPath}_100`, thumbnail100, (err) => {
    if (err) {
      throw err;
    }
  });
  done();
});

queue2.process(async (job, done) => {
  const { userId } = job.data;
  if (!userId) {
    throw new Error('Missing userId');
  }
  const usersCollection = dbClient.db.collection('users');
  const user = await usersCollection.findOne({ _id: ObjectId(userId) });
  if (!user) {
    throw new Error('User not found');
  }
  console.log(`Welcome ${user.email}!`);
  done();
});
