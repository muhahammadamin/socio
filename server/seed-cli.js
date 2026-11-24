// npm run seed — пересоздать демо-данные в базе.
import { seedDemo } from './seed.js';
await seedDemo();
console.log('Демо-данные пересозданы.');
