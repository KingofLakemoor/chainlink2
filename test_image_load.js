import fs from 'fs';
import path from 'path';

const imagePath = path.resolve('public/images/fourth_of_july_hero.png');
if (fs.existsSync(imagePath)) {
    console.log("Image exists!");
    const stats = fs.statSync(imagePath);
    console.log("Size:", stats.size);
} else {
    console.log("Image not found at:", imagePath);
}
