


const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { db, dbQuery } = require('./db');

async function seed() {
  console.log('Seeding started...');
  
  
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  
  try {
    
    console.log('Clearing old database tables if they exist...');
    await dbQuery.exec(`
      DROP TABLE IF EXISTS notifications;
      DROP TABLE IF EXISTS payouts;
      DROP TABLE IF EXISTS feedback;
      DROP TABLE IF EXISTS reviews;
      DROP TABLE IF EXISTS wishlist;
      DROP TABLE IF EXISTS bookings;
      DROP TABLE IF EXISTS ticket_types;
      DROP TABLE IF EXISTS events;
      DROP TABLE IF EXISTS users;
    `);
    
    
    console.log('Creating tables...');
    
    await dbQuery.exec(schemaSql);
    console.log('Tables created successfully.');
    
    
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync('password123', salt);
    
    
    console.log('Inserting sample users...');
    const orgId = (await dbQuery.run(
      `INSERT INTO users (name, email, password, role, phone, address, city, linkedin_url, share_linkedin)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'Alex Mercer (Organiser)',
        'organiser@eventsphere.com',
        hashedPassword,
        'organiser',
        '+919876543210',
        'Sector 62, Noida, UP',
        'Noida',
        'https://linkedin.com/in/alex-mercer-dummy',
        1
      ]
    )).id;
    
    const attendeeId = (await dbQuery.run(
      `INSERT INTO users (name, email, password, role, phone, address, city, linkedin_url, share_linkedin)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'John Doe (Attendee)',
        'attendee@eventsphere.com',
        hashedPassword,
        'attendee',
        '+919876500000',
        'Connaught Place, New Delhi',
        'Delhi',
        'https://linkedin.com/in/john-doe-dummy',
        1
      ]
    )).id;

    console.log(`Created Organizer ID: ${orgId}, Attendee ID: ${attendeeId}`);
    
    
    const eventsData = [
      {
        title: 'Sunburn Festival Goa 2026',
        description: 'Experience India\'s biggest Electronic Dance Music festival on the beaches of Goa. Featuring top international DJs, state-of-the-art stage designs, and visual displays that will blow your mind.',
        category: 'Music',
        banner_image: 'sunburn.jpg',
        venue_name: 'Vagator Beach',
        venue_address: 'Vagator, Goa',
        city: 'Goa',
        is_online: 0,
        online_link: '',
        start_date: '2026-12-28 14:00:00',
        end_date: '2026-12-30 22:00:00',
        agenda: JSON.stringify([
          { time: '02:00 PM', title: 'Gates Open & Local Artist Showcase' },
          { time: '05:00 PM', title: 'Sunset Deep House Set by DJ Sunny' },
          { time: '08:00 PM', title: 'Mainstage Opening Ceremony' },
          { time: '09:30 PM', title: 'Headliner Set - Martin Garrix' }
        ]),
        speakers: JSON.stringify([
          { name: 'Martin Garrix', designation: 'Mainstage Headliner DJ' },
          { name: 'DJ Sunny', designation: 'Opening DJ' }
        ]),
        faq: JSON.stringify([
          { q: 'Is there an age limit?', a: 'Yes, 18+ only. Please bring valid identity proof.' },
          { q: 'Are outside food and drinks allowed?', a: 'No, but there are plenty of food stalls inside.' }
        ]),
        status: 'upcoming'
      },
      {
        title: 'Bassi Live - Standup Comedy Special',
        description: 'Anubhav Singh Bassi is back with a fresh set of hilarious stories! Get ready for a night full of laughter, relatable anecdotes, and unmatched crowd work.',
        category: 'Comedy',
        banner_image: 'bassi.jpg',
        venue_name: 'Siri Fort Auditorium',
        venue_address: 'August Kranti Marg, Siri Fort',
        city: 'Delhi',
        is_online: 0,
        online_link: '',
        start_date: '2026-06-15 19:30:00',
        end_date: '2026-06-15 21:30:00',
        agenda: JSON.stringify([
          { time: '07:00 PM', title: 'Audience Entry & Seating' },
          { time: '07:30 PM', title: 'Opening Act by Nitin Gupta' },
          { time: '07:50 PM', title: 'Bassi takes the stage' },
          { time: '09:15 PM', title: 'Meet and Greet (VIP ticket holders)' }
        ]),
        speakers: JSON.stringify([
          { name: 'Anubhav Singh Bassi', designation: 'Standup Comic' },
          { name: 'Nitin Gupta', designation: 'Opening Act' }
        ]),
        faq: JSON.stringify([
          { q: 'Are children allowed?', a: '16+ age recommendation due to mature content.' },
          { q: 'Is photography permitted?', a: 'No recording is allowed during the show.' }
        ]),
        status: 'upcoming'
      },
      {
        title: 'Global AI & Web3 Hackathon 2026',
        description: 'A 48-hour online hackathon where developers, designers, and students come together to build innovative products at the intersection of Artificial Intelligence and decentralized technologies.',
        category: 'Tech',
        banner_image: 'ai_hackathon.jpg',
        venue_name: 'Virtual Platform (Discord/Zoom)',
        venue_address: 'Online Event',
        city: 'Online',
        is_online: 1,
        online_link: 'https://zoom.us/j/dummy-hackathon-link',
        start_date: '2026-07-10 10:00:00',
        end_date: '2026-07-12 18:00:00',
        agenda: JSON.stringify([
          { time: 'Friday 10:00 AM', title: 'Opening Ceremony & Theme Announcement' },
          { time: 'Friday 11:00 AM', title: 'Team Formation & Hacking Starts' },
          { time: 'Saturday 04:00 PM', title: 'Mid-way Mentorship Review' },
          { time: 'Sunday 04:00 PM', title: 'Submissions Close & Final Demos' }
        ]),
        speakers: JSON.stringify([
          { name: 'Dr. Ramesh Raskar', designation: 'MIT Media Lab Professor' },
          { name: 'Ayush Pal', designation: 'Lead Organizer' }
        ]),
        faq: JSON.stringify([
          { q: 'Is there a registration fee?', a: 'No, participation is completely free!' },
          { q: 'Can I participate solo?', a: 'Yes, but teams of 2-4 are highly recommended.' }
        ]),
        status: 'upcoming'
      }
    ];

    
    for (const event of eventsData) {
      const result = await dbQuery.run(
        `INSERT INTO events (organiser_id, title, description, category, banner_image, venue_name, venue_address, city, is_online, online_link, start_date, end_date, agenda, speakers, faq, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orgId,
          event.title,
          event.description,
          event.category,
          event.banner_image,
          event.venue_name,
          event.venue_address,
          event.city,
          event.is_online,
          event.online_link,
          event.start_date,
          event.end_date,
          event.agenda,
          event.speakers,
          event.faq,
          event.status
        ]
      );
      const newEventId = result.id;
      console.log(`Inserted event: ${event.title} with ID: ${newEventId}`);
      
      
      if (event.category === 'Music') {
        
        await dbQuery.run(
          `INSERT INTO ticket_types (event_id, name, price, capacity, sold, discount_code, discount_percent, early_bird_price, early_bird_expiry)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [newEventId, 'General', 1500, 500, 0, 'SUNBURN10', 10, 1200, '2026-11-30 23:59:59']
        );
        await dbQuery.run(
          `INSERT INTO ticket_types (event_id, name, price, capacity, sold, discount_code, discount_percent, early_bird_price, early_bird_expiry)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [newEventId, 'VIP Pass', 4500, 100, 0, 'SUNBURNVIP', 15, 3800, '2026-11-30 23:59:59']
        );
      } else if (event.category === 'Comedy') {
        await dbQuery.run(
          `INSERT INTO ticket_types (event_id, name, price, capacity, sold, discount_code, discount_percent)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [newEventId, 'Standard Ticket', 799, 300, 0, 'LAUGH50', 5]
        );
        await dbQuery.run(
          `INSERT INTO ticket_types (event_id, name, price, capacity, sold)
           VALUES (?, ?, ?, ?, ?)`
          ,[newEventId, 'Front Row VIP', 1499, 50, 0]
        );
      } else { 
        await dbQuery.run(
          `INSERT INTO ticket_types (event_id, name, price, capacity, sold)
           VALUES (?, ?, ?, ?, ?)`,
          [newEventId, 'Free Hacker Pass', 0, 1000, 0]
        );
      }
    }

    
    const sunburnId = 1; 
    await dbQuery.run(
      `INSERT INTO reviews (user_id, event_id, rating, comment)
       VALUES (?, ?, ?, ?)`,
      [attendeeId, sunburnId, 5, 'Best festival ever! Went last year as well, Martin Garrix was insane. Eagerly waiting for 2026!']
    );

    console.log('Database seeding successfully finished.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed database:', error);
    process.exit(1);
  }
}

seed();
