const bcrypt = require('bcryptjs');
const { db, generateVerificationHash } = require('./database');

function seedIfEmpty() {
  const existing = db.prepare('SELECT COUNT(*) AS count FROM users').get();
  if (existing && existing.count > 0) {
    return false;
  }

  const passwordHash = bcrypt.hashSync('Student@123', 10);
  const evalHash = bcrypt.hashSync('Evaluator@123', 10);

  const insertUser = db.prepare(
    'INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)'
  );
  const insertProfile = db.prepare(`
    INSERT INTO profiles (
      user_id, slug, headline, bio, university, department,
      graduation_year, gpa, location, github_url, linkedin_url, website_url, avatar_url, is_public
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertSkill = db.prepare(
    'INSERT INTO skills (user_id, name, category, proficiency) VALUES (?, ?, ?, ?)'
  );
  const insertAcademic = db.prepare(`
    INSERT INTO academics (
      user_id, institution, degree, field_of_study, start_year, end_year, grade, honors, description
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertProject = db.prepare(`
    INSERT INTO projects (
      user_id, title, summary, description, tech_stack, repo_url, live_url, image_url, featured, completed_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertCert = db.prepare(`
    INSERT INTO certificates (
      user_id, title, issuer, issue_date, expiry_date, credential_id, verification_hash, file_url, status, verified_by, verified_at, description
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertActivity = db.prepare(`
    INSERT INTO activities (
      user_id, title, organization, role, category, start_date, end_date, impact, description
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertEndorsement = db.prepare(`
    INSERT INTO endorsements (student_id, evaluator_name, evaluator_role, comment, rating)
    VALUES (?, ?, ?, ?, ?)
  `);

  // Evaluator / Faculty Account
  insertUser.run('Dr. Meera Kulkarni', 'evaluator@university.edu', evalHash, 'evaluator');

  // Student 1: Aarav Sharma
  const s1 = insertUser.run('Aarav Sharma', 'aarav@university.edu', passwordHash, 'student').lastInsertRowid;
  insertProfile.run(
    s1,
    'aarav-sharma',
    'Full-Stack Developer & AI Systems Researcher',
    'Computer Science senior building scalable web platforms, applied machine learning tools, and open-source developer utilities. Passionate about clean architecture and civic tech.',
    'National Institute of Technology',
    'Computer Science & Engineering',
    2026,
    9.24,
    'Bengaluru, India',
    'https://github.com/aarav-sharma',
    'https://linkedin.com/in/aarav-sharma',
    'https://aaravsharma.dev',
    '',
    1
  );

  [
    ['TypeScript', 'Technical', 92],
    ['React', 'Technical', 90],
    ['Node.js', 'Technical', 88],
    ['Python', 'Technical', 86],
    ['SQL & Databases', 'Technical', 85],
    ['Machine Learning', 'Research', 80],
    ['Team Leadership', 'Leadership', 84],
    ['System Design', 'Technical', 82]
  ].forEach(([n, c, p]) => insertSkill.run(s1, n, c, p));

  insertAcademic.run(
    s1,
    'National Institute of Technology',
    'B.Tech',
    'Computer Science & Engineering',
    2022,
    2026,
    '9.24 / 10.0 CGPA',
    "Dean's Merit List (2023, 2024, 2025)",
    'Relevant Coursework: Distributed Systems, Database Internals, Machine Learning, Computer Networks.'
  );
  insertAcademic.run(
    s1,
    'Delhi Public Senior Secondary',
    'Higher Secondary (Class XII)',
    'Science & Mathematics',
    2020,
    2022,
    '96.4%',
    'Top 1% State Merit Scholarship',
    'Computer Science & Mathematics specialization.'
  );

  insertProject.run(
    s1,
    'SmartCampus Energy Optimizer',
    'IoT + ML dashboard reducing campus HVAC power waste by 18%.',
    'Built an end-to-end telemetry pipeline ingesting sensor data from 42 classrooms, forecasting occupancy with gradient boosted trees, and providing real-time anomaly alerts.',
    'Python, FastAPI, React, PostgreSQL, Docker',
    'https://github.com/aarav-sharma/smartcampus-energy',
    'https://smartcampus-demo.example.com',
    '',
    1,
    '2025-11'
  );
  insertProject.run(
    s1,
    'PeerCode Review Studio',
    'Collaborative browser IDE for university lab grading and code reviews.',
    'Designed a real-time collaborative workspace with inline rubric scoring, automated test-suite execution, and GitHub Classroom sync used by 300+ students.',
    'TypeScript, Node.js, WebSockets, SQLite',
    'https://github.com/aarav-sharma/peercode-studio',
    'https://peercode.example.com',
    '',
    1,
    '2025-04'
  );

  const c1Payload = { user: s1, title: 'AWS Certified Cloud Practitioner', issuer: 'Amazon Web Services', id: 'CERT-2026-8841' };
  insertCert.run(
    s1,
    'AWS Certified Cloud Practitioner',
    'Amazon Web Services',
    '2025-08-14',
    '2028-08-14',
    'CERT-2026-8841',
    generateVerificationHash(c1Payload),
    '',
    'verified',
    'Dr. Meera Kulkarni',
    '2025-09-02',
    'Validated foundational cloud architecture, security, and deployment proficiency.'
  );
  const c2Payload = { user: s1, title: 'Smart India Hackathon National Finalist', issuer: 'Ministry of Education Innovation Cell', id: 'CERT-2026-4190' };
  insertCert.run(
    s1,
    'Smart India Hackathon National Finalist',
    'Ministry of Education Innovation Cell',
    '2025-12-10',
    '',
    'CERT-2026-4190',
    generateVerificationHash(c2Payload),
    '',
    'verified',
    'Dr. Meera Kulkarni',
    '2026-01-05',
    'National finalist among 1,400+ collegiate engineering teams.'
  );
  const c3Payload = { user: s1, title: 'Deep Learning Specialization', issuer: 'DeepLearning.AI', id: 'CERT-2026-7312' };
  insertCert.run(
    s1,
    'Deep Learning Specialization',
    'DeepLearning.AI',
    '2026-02-18',
    '',
    'CERT-2026-7312',
    generateVerificationHash(c3Payload),
    '',
    'pending',
    '',
    '',
    '5-course neural networks, CNN, and sequence modeling specialization.'
  );

  insertActivity.run(
    s1,
    'ACM Student Chapter',
    'NIT ACM Chapter',
    'Technical Lead',
    'Club',
    '2024-01',
    '2025-12',
    'Organized 12 coding workshops for 650+ freshmen',
    'Led weekly DSA & web engineering bootcamps and mentored 18 sophomore project teams.'
  );
  insertActivity.run(
    s1,
    'HackNIT 2025',
    'NIT Innovation Council',
    '1st Runner-Up',
    'Hackathon',
    '2025-03',
    '2025-03',
    'Built accessibility voice-navigator in 36 hours',
    'Developed an offline-first voice navigation assistant for visually impaired commuters.'
  );

  insertEndorsement.run(
    s1,
    'Dr. Meera Kulkarni',
    'Associate Professor, CSE',
    'Aarav consistently delivers production-grade systems and mentors junior cohorts with remarkable clarity.',
    5
  );

  // Student 2: Priya Nair
  const s2 = insertUser.run('Priya Nair', 'priya@university.edu', passwordHash, 'student').lastInsertRowid;
  insertProfile.run(
    s2,
    'priya-nair',
    'Product Designer & Frontend Engineer',
    'Human-Computer Interaction enthusiast bridging accessible UX research with high-craft frontend engineering. Designing inclusive digital products for education and healthcare.',
    'National Institute of Technology',
    'Information Technology',
    2026,
    9.05,
    'Kochi, India',
    'https://github.com/priya-nair',
    'https://linkedin.com/in/priya-nair',
    'https://priyanair.design',
    '',
    1
  );

  [
    ['UI/UX Design', 'Design', 95],
    ['Figma', 'Design', 94],
    ['React', 'Technical', 88],
    ['CSS & Design Systems', 'Design', 92],
    ['JavaScript', 'Technical', 87],
    ['User Research', 'Research', 89],
    ['Accessibility (WCAG)', 'Design', 90]
  ].forEach(([n, c, p]) => insertSkill.run(s2, n, c, p));

  insertAcademic.run(
    s2,
    'National Institute of Technology',
    'B.Tech',
    'Information Technology',
    2022,
    2026,
    '9.05 / 10.0 CGPA',
    'Best Undergraduate HCI Thesis Nominee',
    'Focus on Human-Computer Interaction, Visual Design, and Web Engineering.'
  );

  insertProject.run(
    s2,
    'MedBridge Patient Portal',
    'WCAG AAA accessible multilingual telehealth portal for rural clinics.',
    'Conducted field usability studies with 28 patients and engineered a low-bandwidth React interface with voice-assisted prescription summaries.',
    'React, Tailwind CSS, Figma, Web Speech API',
    'https://github.com/priya-nair/medbridge',
    'https://medbridge-ui.example.com',
    '',
    1,
    '2025-10'
  );
  insertProject.run(
    s2,
    'Aura Design System',
    'Open-source 45-component accessible UI library with dark mode tokens.',
    'Created a zero-dependency CSS token architecture and Storybook documentation adopted by 4 student clubs.',
    'CSS3, TypeScript, Storybook, Accessibility',
    'https://github.com/priya-nair/aura-ds',
    '',
    '',
    0,
    '2025-06'
  );

  const c4Payload = { user: s2, title: 'Google UX Design Professional Certificate', issuer: 'Google / Coursera', id: 'CERT-2026-5529' };
  insertCert.run(
    s2,
    'Google UX Design Professional Certificate',
    'Google / Coursera',
    '2025-05-20',
    '',
    'CERT-2026-5529',
    generateVerificationHash(c4Payload),
    '',
    'verified',
    'Dr. Meera Kulkarni',
    '2025-06-11',
    'Completed 7-course end-to-end UX research, wireframing, and prototyping track.'
  );

  insertActivity.run(
    s2,
    'Design Guild NIT',
    'Student Design Collective',
    'President',
    'Club',
    '2023-08',
    '2025-11',
    'Grew membership from 35 to 180+ student designers',
    'Hosted annual Designathon and portfolio critique clinics.'
  );

  insertEndorsement.run(
    s2,
    'Prof. Rohan Deshmukh',
    'HCI Lab Advisor',
    'Priya combines rigorous user research with crisp frontend execution. Her MedBridge prototype set a department benchmark.',
    5
  );

  // Student 3: Rohan Verma
  const s3 = insertUser.run('Rohan Verma', 'rohan@university.edu', passwordHash, 'student').lastInsertRowid;
  insertProfile.run(
    s3,
    'rohan-verma',
    'Data Scientist & Competitive Programmer',
    'Applied Mathematics & Data Science undergraduate focused on NLP, statistical modeling, and algorithmic problem solving.',
    'Indian Institute of Information Technology',
    'Data Science & AI',
    2027,
    8.82,
    'Pune, India',
    'https://github.com/rohan-verma',
    'https://linkedin.com/in/rohan-verma',
    '',
    '',
    1
  );

  [
    ['Python', 'Technical', 95],
    ['Machine Learning', 'Research', 91],
    ['SQL & Databases', 'Technical', 88],
    ['Data Visualization', 'Design', 84],
    ['C++', 'Technical', 89],
    ['Statistical Modeling', 'Research', 87]
  ].forEach(([n, c, p]) => insertSkill.run(s3, n, c, p));

  insertAcademic.run(
    s3,
    'Indian Institute of Information Technology',
    'B.Tech',
    'Data Science & Artificial Intelligence',
    2023,
    2027,
    '8.82 / 10.0 CGPA',
    'ICPC Regionalist 2025',
    'Coursework in Probability, Statistical Inference, Deep Learning, and Big Data Analytics.'
  );

  insertProject.run(
    s3,
    'FinSight Sentiment Engine',
    'Real-time earnings-call NLP analyzer tracking corporate risk signals.',
    'Fine-tuned transformer embeddings on 12,000 financial transcripts with an interactive Plotly dashboard.',
    'Python, PyTorch, HuggingFace, SQLite, Streamlit',
    'https://github.com/rohan-verma/finsight-nlp',
    '',
    '',
    1,
    '2026-01'
  );

  const c5Payload = { user: s3, title: 'ICPC Asia West Regionalist', issuer: 'ICPC Foundation', id: 'CERT-2026-3094' };
  insertCert.run(
    s3,
    'ICPC Asia West Regionalist',
    'ICPC Foundation',
    '2025-11-18',
    '',
    'CERT-2026-3094',
    generateVerificationHash(c5Payload),
    '',
    'verified',
    'Dr. Meera Kulkarni',
    '2025-12-01',
    'Qualified and competed in ICPC Asia West Regional Contest.'
  );

  insertActivity.run(
    s3,
    'CodeSprint Volunteering',
    'Rural STEM Initiative',
    'Python Mentor',
    'Volunteering',
    '2024-06',
    '2025-05',
    'Taught foundational Python to 90 high-school students',
    'Weekend remote mentoring and curriculum design.'
  );

  return true;
}

if (require.main === module) {
  const seeded = seedIfEmpty();
  console.log(seeded ? 'Database seeded successfully.' : 'Database already contains data.');
}

module.exports = { seedIfEmpty };
