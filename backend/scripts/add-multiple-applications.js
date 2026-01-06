import mongoose from 'mongoose';
import Application from '../models/Application.js';
import dotenv from 'dotenv';

dotenv.config();

async function addMultipleApplications() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // No dummy applications for production
    const applications = [
      // Real applications will be submitted through the application process
    ];

    // No dummy applications to save in production
    if (applications.length === 0) {
      console.log('Production mode: No dummy applications to add');
    } else {
      // Save all applications
      for (const appData of applications) {
        const application = new Application(appData);
        const savedApp = await application.save();
        console.log(`Application added: ${savedApp._id} - ${appData.disasterType} in ${appData.location}`);
      }
    }

    // Close connection
    await mongoose.connection.close();
    console.log('Connection closed');
    
  } catch (error) {
    console.error('Error adding applications:', error);
    process.exit(1);
  }
}

addMultipleApplications();