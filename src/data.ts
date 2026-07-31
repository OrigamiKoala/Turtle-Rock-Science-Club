import { LabLog, Mission, GalleryPhoto, FAQItem, Announcement, PressMention } from './types';

export const initialLabLogs: LabLog[] = [
  {
    id: 'log-1',
    title: 'The Great Chemistry Blast',
    date: 'June 18, 2026',
    category: 'chemistry',
    summary: 'Our junior scientists investigated acid-base reactions by creating custom-tinted effervescent volcanos.',
    content: 'We combined standard acetic acid (vinegar) and sodium bicarbonate (baking soda) within custom 3D-printed volcanic cones. By introducing organic dish soaps and concentrated liquid watercolor pigments, we achieved a sustained, thick foam eruption. Our scientists recorded the reaction time, temperature shifts, and studied how viscosity affects the flow rate of simulated lava.',
    image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&q=80&w=800',
    author: 'Dr. Elena Vance'
  },
  {
    id: 'log-2',
    title: 'Robot Rumble & Obstacle Run',
    date: 'June 25, 2026',
    category: 'robotics',
    summary: 'A day of micro-controller assembly, line-following sensors, and navigating the winding lab maze.',
    content: 'Our engineering cohort spent the afternoon soldering custom motor shields onto Arduino micro-controllers. After assembly, they calibrated dual infrared photodiode sensors to follow a retroreflective tape line. The climax of the workshop was the Maze Obstacle Run, where robots had to dynamically sense and avoid cardboard barriers using ultrasonic rangefinders.',
    image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=800',
    author: 'Mentor Marcus Chen'
  },
  {
    id: 'log-3',
    title: 'Galaxy Quest: Jupiter & Moons',
    date: 'July 1, 2026',
    category: 'astronomy',
    summary: 'Using our high-powered Celestron telescope to chart the four Galilean moons on a crystal-clear night.',
    content: 'Under pristine dark skies, our astronomers calibrated the 8-inch Schmidt-Cassegrain telescope. We successfully resolved the distinctive equatorial bands of Jupiter and tracked Io, Europa, Ganymede, and Callisto. The youth plotted their observed moon positions on custom polar charts and compared them with real-time astronomical model predictions.',
    image: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?auto=format&fit=crop&q=80&w=800',
    author: 'Stargazer Sarah Jenkins'
  }
];

export const missionsData = {
  turtlerock: [
    {
      id: 'mission-1',
      title: 'Lava Lamp Social',
      date: 'July 12, 2026',
      time: '4:00 PM - 5:30 PM',
      location: 'Turtle Rock Clubhouse',
      description: 'Bring a friend, enjoy some fruit punch, and build a beautiful, personalized, colorful lava lamp to take home! We will explore density, oil-water polarity, and effervescent reactions in a fun, relaxed social atmosphere.',
      spotsTotal: 25,
      spotsReserved: 18,
      image: 'https://images.unsplash.com/photo-1544377193-33dcf4d68fb5?auto=format&fit=crop&q=80&w=800'
    },
    {
      id: 'mission-2',
      title: 'Community Stargazing Night',
      date: 'July 18, 2026',
      time: '8:30 PM - 10:30 PM',
      location: 'Turtle Rock Valley Park (Overlook Peak)',
      description: 'Join families from around the valley as we point three high-powered community telescopes at the night sky. We will spot Saturn’s rings and the Hercules Star Cluster while sipping hot cocoa and roasting marshmallows.',
      spotsTotal: 40,
      spotsReserved: 32,
      image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800'
    },
    {
      id: 'mission-3',
      title: 'Robot Builders: Crawler Edition',
      date: 'August 2, 2026',
      time: '1:00 PM - 3:30 PM',
      location: 'Turtle Rock Clubhouse Basecamp',
      description: 'A beginner-friendly robotics session where we assemble 4-legged walking insect crawlers using balsa wood, micro servo motors, and simple circuit boards. Parents are encouraged to assist with basic gluing and wire routing!',
      spotsTotal: 15,
      spotsReserved: 11,
      image: 'https://images.unsplash.com/photo-1531747118685-ca8fa6e08806?auto=format&fit=crop&q=80&w=800'
    }
  ] as Mission[],
  kinetic: [
    {
      id: 'mission-1-k',
      title: 'Lava Lamp Density Workshop',
      date: 'July 15, 2026',
      time: '2:00 PM - 4:00 PM',
      location: 'Kinetic Main Lab, Bench C',
      description: 'A formal laboratory session where we scientifically investigate oil-and-water polarity, calculate specific density differences, and engineer a pressurized liquid reaction chamber. We will analyze how temperature affects gas release rates.',
      spotsTotal: 16,
      spotsReserved: 12,
      image: 'https://images.unsplash.com/photo-1544377193-33dcf4d68fb5?auto=format&fit=crop&q=80&w=800'
    },
    {
      id: 'mission-2-k',
      title: 'Telescope Star-Charting Night',
      date: 'July 22, 2026',
      time: '9:00 PM - 11:30 PM',
      location: 'Kinetic Astronomy Dome (Roof Level)',
      description: 'A focused astronomical observation session. Scientists will calibrate optical gear, use Right Ascension and Declination coordinates to target the Ring Nebula, and record magnitude readings of variable stars.',
      spotsTotal: 12,
      spotsReserved: 10,
      image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800'
    },
    {
      id: 'mission-3-k',
      title: 'Autonomous Navigation Lab',
      date: 'August 5, 2026',
      time: '10:00 AM - 1:00 PM',
      location: 'Kinetic Engineering Hub',
      description: 'A deep-dive into PID controller feedback loops. Learn to program autonomous mobile robots to compute error correction values in real-time to maintain perfect tracking on irregular lines and steep ramps.',
      spotsTotal: 10,
      spotsReserved: 7,
      image: 'https://images.unsplash.com/photo-1531747118685-ca8fa6e08806?auto=format&fit=crop&q=80&w=800'
    }
  ] as Mission[]
};

export const initialGalleryPhotos: GalleryPhoto[] = [
  {
    id: 'photo-1',
    title: 'The Glow-in-the-Dark Catalyst',
    description: 'Youth scientists staring in amazement at luminol chemiluminescent reactions in dark flasks.',
    category: 'experiments',
    imageUrl: 'https://images.unsplash.com/photo-1617155093730-a8bf47be792d?auto=format&fit=crop&q=80&w=800',
    submittedBy: 'Parent Mark T.',
    date: 'June 10, 2026'
  },
  {
    id: 'photo-2',
    title: 'Monthly Mission Briefing',
    description: 'Our core club members planning out their autonomous robot chassis designs on the whiteboard.',
    category: 'lab-meetings',
    imageUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=800',
    submittedBy: 'Mentor Marcus Chen',
    date: 'June 15, 2026'
  },
  {
    id: 'photo-3',
    title: 'Stargazing Night at Turtle Rock Park',
    description: 'A crisp evening setting up the Newtonian reflector telescope on the grassy ridge.',
    category: 'field-trips',
    imageUrl: 'https://images.unsplash.com/photo-1539186607619-df476afe3ff1?auto=format&fit=crop&q=80&w=800',
    submittedBy: 'Stargazer Sarah Jenkins',
    date: 'June 22, 2026'
  },
  {
    id: 'photo-4',
    title: 'Turtle Rock Valley Geological Trek',
    description: 'Collecting mineral specimens and classifying basalt fragments along the creek bed.',
    category: 'field-trips',
    imageUrl: 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?auto=format&fit=crop&q=80&w=800',
    submittedBy: 'Parent Emily S.',
    date: 'June 29, 2026'
  },
  {
    id: 'photo-5',
    title: 'Micro-Biology Basics Session',
    description: 'Calibrating compound microscopes and discovering the tiny tardigrades swimming in local pond moss.',
    category: 'experiments',
    imageUrl: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&q=80&w=800',
    submittedBy: 'Dr. Elena Vance',
    date: 'July 2, 2026'
  },
  {
    id: 'photo-6',
    title: 'Robotics Workshop Calibration',
    description: 'Perfecting the weight distribution of the servo crawler chassis to prevent tipping.',
    category: 'experiments',
    imageUrl: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&q=80&w=800',
    submittedBy: 'Youth Scientist Leo G. (Age 11)',
    date: 'July 5, 2026'
  }
];

export const faqItems: FAQItem[] = [
  {
    id: 'faq-1',
    question: 'What age groups can participate in the club?',
    answer: 'Our programs are optimized for curiosity seekers aged 6 to 14, but older kids and high-schoolers are always welcome to join as mentors and session assistants!'
  },
  {
    id: 'faq-2',
    question: 'How do you ensure participant safety during experiments?',
    answer: 'Safety is our absolute #1 priority! All experiments are guided by experienced adult mentors. We provide customized, impact-resistant child safety goggles, splash lab coats, and chemical-resistant gloves. We strictly avoid volatile, toxic, or highly concentrated chemicals.'
  },
  {
    id: 'faq-3',
    question: 'What materials do we need to bring from home?',
    answer: 'We provide all lab equipment, reagent materials, electronic parts, safety gear, and instructional worksheets. The only things participants must bring are an inquisitive mind, comfortable clothes, and mandatory closed-toe shoes!'
  },
  {
    id: 'faq-4',
    question: 'Can parents volunteer or stay during meetings?',
    answer: 'Yes, absolutely! We love active parent involvement. Parents can volunteer to assist with active bench experiments, coordinate outdoor field trips, provide snack social support, or capture lab photos.'
  }
];

export const announcements: Announcement[] = [
  {
    id: 'ann-1',
    title: 'Phase 2 Expansion Project Completed',
    date: 'June 10, 2026',
    category: 'expansion',
    content: 'We are thrilled to announce that our new Turtle Rock Valley Lab expansion is fully complete! This extension triples our bench space, adds a dedicated electronics soldering table with professional exhaust hoods, and installs a state-of-the-art clean fume hood for more advanced organic chemistry exploration. Classes start next week!'
  },
  {
    id: 'ann-2',
    title: 'Science Member Toolkit v2.0 Released',
    date: 'June 28, 2026',
    category: 'toolkit',
    content: 'Our updated Member Toolkit is now live! Version 2.0 features fully illustrated home laboratory worksheets, interactive science flashcards, a comprehensive checklist of local constellations, and a safety certification passport that kids can stamp as they complete workshops in our physical basecamp.'
  },
  {
    id: 'ann-3',
    title: 'Volunteer Call: Spring Equinox Coordinators',
    date: 'July 4, 2026',
    category: 'volunteer',
    content: 'We are seeking three enthusiastic volunteers to help coordinate our upcoming Spring Equinox Fair. Tasks include organizing safety gear check-ins, setting up the solar filtration telescope stations, and managing the snack social tent. No prior science degree required—just a positive attitude!'
  }
];

export const pressMentions: PressMention[] = [
  {
    id: 'press-1',
    source: 'The Daily Chronicle',
    title: 'Turtle Rock Science Club is Redefining Neighborhood STEM Education',
    date: 'May 14, 2026',
    snippet: 'By combining hands-on parent-student experimentation with top-tier scientific methodology, this small neighborhood collective is showing that you do not need university funding to inspire the next generation of researchers.'
  },
  {
    id: 'press-2',
    source: 'The Valley Bugle',
    title: 'Local Residents Turn Overlook Ridge into Astronomy Hotspot',
    date: 'June 2, 2026',
    snippet: 'Armed with community-calibrated refractors, Turtle Rock Star Watch participants mapped Jupiter with stunning precision, demonstrating how local science collectives foster genuine astronomy passion.'
  }
];
