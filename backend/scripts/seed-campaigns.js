import mongoose from 'mongoose';
import Application from '../models/Application.js';
import dotenv from 'dotenv';

dotenv.config();

const sampleApplications = [
  // No dummy campaigns - production ready
  // Real applications will be submitted through the application process
];

async function seedCampaigns() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing approved applications
    await Application.deleteMany({ status: 'approved' });
    console.log('Cleared existing approved applications');

    // No dummy campaigns to insert - production ready
    console.log('Production mode: No dummy campaigns inserted');

    console.log('Database cleared for production use!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding campaigns:', error);
    process.exit(1);
  }
}

seedCampaigns();