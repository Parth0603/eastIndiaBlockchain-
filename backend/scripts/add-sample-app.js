import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function addSampleApplication() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get the applications collection directly
    const db = mongoose.connection.db;
    const applicationsCollection = db.collection('applications');

    // Add one simple application
    const sampleApp = {
      applicantAddress: '0x1234567890123456789012345678901234567890',
      disasterType: 'earthquake',
      location: 'Turkey & Syria',
      requestedAmount: '100000000000000000000000', // 100,000 * 10^18
      description: 'Devastating earthquake has left thousands of families homeless and in desperate need of basic necessities.',
      status: 'approved',
      priority: 'urgent',
      metadata: {
        familySize: 5,
        hasChildren: true,
        hasElderly: false,
        hasDisabled: false,
        previouslyReceived: false
      },
      reviewedAt: new Date(),
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    };

    // Insert the application
    const result = await applicationsCollection.insertOne(sampleApp);
    console.log('Sample application inserted:', result.insertedId);

    // Close connection
    await mongoose.connection.close();
    console.log('Connection closed');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addSampleApplication();