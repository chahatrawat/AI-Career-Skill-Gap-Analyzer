-- =============================================================================
-- AI Career Skill-Gap Analyzer: seed data (run AFTER schema.sql)
--
-- Careers, skills and the skills each career requires.
-- The required levels and importance values are curated baselines chosen by
-- the team. They are NOT live job-market data and should not be presented as such.
--
-- Levels: 1 Beginner, 2 Basic, 3 Intermediate, 4 Advanced, 5 Expert
-- Importance: 1 low, 2 medium, 3 high
-- Contains no user data. IDs are fixed so career_skills can refer to them.
-- =============================================================================

SET NAMES utf8mb4;

-- Careers ----------------------------------------------------------------------
INSERT INTO careers (id, name, slug, description) VALUES
  (1, 'Python Developer', 'python-developer', 'Builds applications, scripts and services in Python, with a solid grounding in core programming concepts, databases and version control.'),
  (2, 'Full-Stack Developer', 'full-stack-developer', 'Builds both the user interface and the server side of web applications, from HTML and React to Node.js APIs and SQL databases.'),
  (3, 'Frontend Developer', 'frontend-developer', 'Builds responsive, accessible user interfaces for the web using HTML, CSS, JavaScript and modern frameworks such as React.'),
  (4, 'Backend Developer', 'backend-developer', 'Designs and builds server-side applications, REST APIs and databases, with attention to security and reliability.'),
  (5, 'Data Analyst', 'data-analyst', 'Collects, cleans and analyses data, then presents findings with charts and clear explanations to help people decide.'),
  (6, 'AI/ML Engineer', 'ai-ml-engineer', 'Builds and evaluates machine learning models, working with data, Python libraries and the maths behind them.');

-- Skills -----------------------------------------------------------------------
INSERT INTO skills (id, name, slug, category, description) VALUES
  (1, 'Python', 'python', 'Programming Languages', 'General-purpose language widely used for apps, automation, data and AI.'),
  (2, 'JavaScript', 'javascript', 'Programming Languages', 'The language of the web, used in browsers and on servers.'),
  (3, 'TypeScript', 'typescript', 'Programming Languages', 'JavaScript with types, used to catch errors earlier in larger projects.'),
  (4, 'HTML', 'html', 'Web Frontend', 'The structure and content of web pages.'),
  (5, 'CSS', 'css', 'Web Frontend', 'Styling and layout of web pages.'),
  (6, 'React', 'react', 'Web Frontend', 'Library for building component-based user interfaces.'),
  (7, 'Responsive Design', 'responsive-design', 'Web Frontend', 'Making interfaces work well on phones, tablets and desktops.'),
  (8, 'Node.js', 'nodejs', 'Web Backend', 'Running JavaScript on the server.'),
  (9, 'Express.js', 'expressjs', 'Web Backend', 'Minimal web framework for building APIs with Node.js.'),
  (10, 'REST APIs', 'rest-apis', 'Web Backend', 'Designing and using HTTP APIs with clear resources and status codes.'),
  (11, 'Authentication and Security', 'authentication-security', 'Web Backend', 'Passwords, tokens, input validation and protecting user data.'),
  (12, 'SQL', 'sql', 'Databases', 'Querying and changing data in relational databases.'),
  (13, 'MySQL', 'mysql', 'Databases', 'Popular open-source relational database.'),
  (14, 'Database Design', 'database-design', 'Databases', 'Modelling tables, keys, relationships and indexes.'),
  (15, 'Git and GitHub', 'git-github', 'Tools and DevOps', 'Version control and collaboration on code.'),
  (16, 'Linux Basics', 'linux-basics', 'Tools and DevOps', 'Working in the command line and basic system tasks.'),
  (17, 'Docker Basics', 'docker-basics', 'Tools and DevOps', 'Packaging and running applications in containers.'),
  (18, 'Testing and Debugging', 'testing-debugging', 'Tools and DevOps', 'Finding, reproducing and fixing bugs; writing basic tests.'),
  (19, 'Data Structures', 'data-structures', 'CS Fundamentals', 'Lists, stacks, queues, trees, hash tables and when to use each.'),
  (20, 'Algorithms', 'algorithms', 'CS Fundamentals', 'Sorting, searching and reasoning about efficiency.'),
  (21, 'Object-Oriented Programming', 'oop', 'CS Fundamentals', 'Classes, objects, inheritance and encapsulation.'),
  (22, 'Problem Solving', 'problem-solving', 'CS Fundamentals', 'Breaking problems into steps and turning them into working code.'),
  (23, 'Statistics', 'statistics', 'Data and Analytics', 'Averages, distributions, sampling and basic inference.'),
  (24, 'Excel', 'excel', 'Data and Analytics', 'Spreadsheets, formulas and pivot tables for everyday analysis.'),
  (25, 'Pandas and NumPy', 'pandas-numpy', 'Data and Analytics', 'Python libraries for working with tables and numeric arrays.'),
  (26, 'Data Visualization', 'data-visualization', 'Data and Analytics', 'Turning data into clear charts and dashboards.'),
  (27, 'Data Cleaning', 'data-cleaning', 'Data and Analytics', 'Fixing missing, duplicate and inconsistent data.'),
  (28, 'Mathematics for ML', 'maths-for-ml', 'Machine Learning', 'Linear algebra, probability and calculus used in machine learning.'),
  (29, 'Machine Learning Basics', 'ml-basics', 'Machine Learning', 'Supervised and unsupervised learning and the typical workflow.'),
  (30, 'Scikit-learn', 'scikit-learn', 'Machine Learning', 'Python library for classic machine learning models.'),
  (31, 'Model Evaluation', 'model-evaluation', 'Machine Learning', 'Metrics, validation and avoiding overfitting.'),
  (32, 'Deep Learning Basics', 'deep-learning-basics', 'Machine Learning', 'Neural networks and how they are trained.'),
  (33, 'Communication', 'communication', 'Professional', 'Explaining ideas clearly in writing and speech.');

-- Career requirements: (career_id, skill_id, required_level, importance) -------

-- Python Developer
INSERT INTO career_skills (career_id, skill_id, required_level, importance) VALUES
  (1, 1, 4, 3),  -- Python: level 4, importance 3
  (1, 21, 3, 3),  -- Object-Oriented Programming: level 3, importance 3
  (1, 19, 3, 3),  -- Data Structures: level 3, importance 3
  (1, 20, 3, 2),  -- Algorithms: level 3, importance 2
  (1, 12, 3, 2),  -- SQL: level 3, importance 2
  (1, 15, 3, 2),  -- Git and GitHub: level 3, importance 2
  (1, 10, 3, 2),  -- REST APIs: level 3, importance 2
  (1, 18, 3, 2),  -- Testing and Debugging: level 3, importance 2
  (1, 16, 2, 1),  -- Linux Basics: level 2, importance 1
  (1, 22, 3, 3);  -- Problem Solving: level 3, importance 3

-- Full-Stack Developer
INSERT INTO career_skills (career_id, skill_id, required_level, importance) VALUES
  (2, 4, 4, 2),  -- HTML: level 4, importance 2
  (2, 5, 3, 2),  -- CSS: level 3, importance 2
  (2, 2, 4, 3),  -- JavaScript: level 4, importance 3
  (2, 6, 3, 3),  -- React: level 3, importance 3
  (2, 8, 3, 3),  -- Node.js: level 3, importance 3
  (2, 9, 3, 2),  -- Express.js: level 3, importance 2
  (2, 10, 3, 3),  -- REST APIs: level 3, importance 3
  (2, 12, 3, 3),  -- SQL: level 3, importance 3
  (2, 15, 3, 2),  -- Git and GitHub: level 3, importance 2
  (2, 11, 3, 2),  -- Authentication and Security: level 3, importance 2
  (2, 18, 2, 2),  -- Testing and Debugging: level 2, importance 2
  (2, 22, 3, 2);  -- Problem Solving: level 3, importance 2

-- Frontend Developer
INSERT INTO career_skills (career_id, skill_id, required_level, importance) VALUES
  (3, 4, 4, 3),  -- HTML: level 4, importance 3
  (3, 5, 4, 3),  -- CSS: level 4, importance 3
  (3, 2, 4, 3),  -- JavaScript: level 4, importance 3
  (3, 6, 3, 3),  -- React: level 3, importance 3
  (3, 3, 2, 1),  -- TypeScript: level 2, importance 1
  (3, 7, 3, 2),  -- Responsive Design: level 3, importance 2
  (3, 15, 3, 2),  -- Git and GitHub: level 3, importance 2
  (3, 10, 3, 2),  -- REST APIs: level 3, importance 2
  (3, 18, 2, 2),  -- Testing and Debugging: level 2, importance 2
  (3, 33, 2, 1);  -- Communication: level 2, importance 1

-- Backend Developer
INSERT INTO career_skills (career_id, skill_id, required_level, importance) VALUES
  (4, 2, 3, 2),  -- JavaScript: level 3, importance 2
  (4, 8, 4, 3),  -- Node.js: level 4, importance 3
  (4, 9, 3, 3),  -- Express.js: level 3, importance 3
  (4, 10, 4, 3),  -- REST APIs: level 4, importance 3
  (4, 12, 4, 3),  -- SQL: level 4, importance 3
  (4, 13, 3, 2),  -- MySQL: level 3, importance 2
  (4, 14, 3, 3),  -- Database Design: level 3, importance 3
  (4, 11, 3, 3),  -- Authentication and Security: level 3, importance 3
  (4, 15, 3, 2),  -- Git and GitHub: level 3, importance 2
  (4, 17, 2, 1),  -- Docker Basics: level 2, importance 1
  (4, 16, 2, 1),  -- Linux Basics: level 2, importance 1
  (4, 18, 3, 2);  -- Testing and Debugging: level 3, importance 2

-- Data Analyst
INSERT INTO career_skills (career_id, skill_id, required_level, importance) VALUES
  (5, 12, 4, 3),  -- SQL: level 4, importance 3
  (5, 24, 4, 3),  -- Excel: level 4, importance 3
  (5, 23, 3, 3),  -- Statistics: level 3, importance 3
  (5, 27, 3, 3),  -- Data Cleaning: level 3, importance 3
  (5, 26, 4, 3),  -- Data Visualization: level 4, importance 3
  (5, 25, 3, 2),  -- Pandas and NumPy: level 3, importance 2
  (5, 1, 3, 2),  -- Python: level 3, importance 2
  (5, 33, 3, 2),  -- Communication: level 3, importance 2
  (5, 22, 3, 2);  -- Problem Solving: level 3, importance 2

-- AI/ML Engineer
INSERT INTO career_skills (career_id, skill_id, required_level, importance) VALUES
  (6, 1, 4, 3),  -- Python: level 4, importance 3
  (6, 28, 3, 3),  -- Mathematics for ML: level 3, importance 3
  (6, 23, 3, 2),  -- Statistics: level 3, importance 2
  (6, 25, 4, 3),  -- Pandas and NumPy: level 4, importance 3
  (6, 29, 4, 3),  -- Machine Learning Basics: level 4, importance 3
  (6, 30, 3, 3),  -- Scikit-learn: level 3, importance 3
  (6, 31, 3, 2),  -- Model Evaluation: level 3, importance 2
  (6, 32, 3, 2),  -- Deep Learning Basics: level 3, importance 2
  (6, 19, 3, 1),  -- Data Structures: level 3, importance 1
  (6, 15, 2, 1),  -- Git and GitHub: level 2, importance 1
  (6, 22, 3, 2);  -- Problem Solving: level 3, importance 2
