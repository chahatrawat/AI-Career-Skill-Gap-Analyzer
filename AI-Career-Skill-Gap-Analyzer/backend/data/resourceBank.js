'use strict';

/**
 * Curated learning resources, keyed by skill slug (see seed.sql).
 * Entry: [title, url, type, level] where type is docs | video | course | practice | interactive
 * and level is 'beginner' | 'intermediate' (what the resource is good for).
 *
 * The AI never writes or suggests URLs (README section 4): every link here was
 * chosen by the team, and all of them point at official documentation or
 * long-standing free learning sites. Links can move over time; every skill also
 * gets a generated search link (see resourceService) as a safety net.
 */

const R = (title, url, type, level = 'beginner') => ({ title, url, type, level });

const BANK = {
  python: [
    R('The Python Tutorial (official)', 'https://docs.python.org/3/tutorial/', 'docs'),
    R('Exercism: Python track', 'https://exercism.org/tracks/python', 'practice'),
    R('freeCodeCamp: Scientific Computing with Python', 'https://www.freecodecamp.org/learn/scientific-computing-with-python/', 'course', 'intermediate'),
  ],
  javascript: [
    R('MDN: JavaScript guide', 'https://developer.mozilla.org/en-US/docs/Learn/JavaScript', 'docs'),
    R('The Modern JavaScript Tutorial', 'https://javascript.info/', 'docs', 'intermediate'),
    R('Exercism: JavaScript track', 'https://exercism.org/tracks/javascript', 'practice'),
  ],
  typescript: [
    R('TypeScript Handbook', 'https://www.typescriptlang.org/docs/handbook/intro.html', 'docs'),
    R('TypeScript for JavaScript programmers', 'https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html', 'docs'),
    R('Exercism: TypeScript track', 'https://exercism.org/tracks/typescript', 'practice', 'intermediate'),
  ],
  html: [
    R('MDN: Structuring content with HTML', 'https://developer.mozilla.org/en-US/docs/Learn/HTML', 'docs'),
    R('web.dev: Learn HTML', 'https://web.dev/learn/html', 'course'),
    R('freeCodeCamp: Responsive Web Design', 'https://www.freecodecamp.org/learn/2022/responsive-web-design/', 'practice'),
  ],
  css: [
    R('MDN: CSS first steps', 'https://developer.mozilla.org/en-US/docs/Learn/CSS', 'docs'),
    R('web.dev: Learn CSS', 'https://web.dev/learn/css', 'course', 'intermediate'),
    R('Flexbox Froggy', 'https://flexboxfroggy.com/', 'interactive'),
  ],
  react: [
    R('React: Learn (official)', 'https://react.dev/learn', 'docs'),
    R('React: Tutorial, tic-tac-toe', 'https://react.dev/learn/tutorial-tic-tac-toe', 'practice'),
    R('React: Thinking in React', 'https://react.dev/learn/thinking-in-react', 'docs', 'intermediate'),
  ],
  'responsive-design': [
    R('web.dev: Learn Responsive Design', 'https://web.dev/learn/design', 'course'),
    R('MDN: Responsive design', 'https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design', 'docs'),
    R('MDN: Using media queries', 'https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_media_queries/Using_media_queries', 'docs', 'intermediate'),
  ],
  nodejs: [
    R('Node.js: Learn (official)', 'https://nodejs.org/en/learn', 'docs'),
    R('Node.js API documentation', 'https://nodejs.org/docs/latest/api/', 'docs', 'intermediate'),
    R('MDN: Server-side with Express and Node', 'https://developer.mozilla.org/en-US/docs/Learn/Server-side/Express_Nodejs', 'course'),
  ],
  expressjs: [
    R('Express: Getting started', 'https://expressjs.com/en/starter/installing.html', 'docs'),
    R('Express: Routing guide', 'https://expressjs.com/en/guide/routing.html', 'docs'),
    R('MDN: Express tutorial, local library', 'https://developer.mozilla.org/en-US/docs/Learn/Server-side/Express_Nodejs/Tutorial_local_library_website', 'course', 'intermediate'),
  ],
  'rest-apis': [
    R('MDN: HTTP request methods', 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods', 'docs'),
    R('MDN: HTTP response status codes', 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Status', 'docs'),
    R('RESTful API tutorial', 'https://restfulapi.net/', 'docs', 'intermediate'),
  ],
  'authentication-security': [
    R('OWASP Top Ten', 'https://owasp.org/www-project-top-ten/', 'docs'),
    R('OWASP: Password storage cheat sheet', 'https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html', 'docs', 'intermediate'),
    R('Introduction to JSON Web Tokens', 'https://jwt.io/introduction', 'docs'),
  ],
  sql: [
    R('SQLBolt: interactive SQL lessons', 'https://sqlbolt.com/', 'interactive'),
    R('W3Schools: SQL tutorial', 'https://www.w3schools.com/sql/', 'docs'),
    R('SQLZoo', 'https://sqlzoo.net/', 'practice', 'intermediate'),
  ],
  mysql: [
    R('MySQL 8.0: Tutorial (official)', 'https://dev.mysql.com/doc/refman/8.0/en/tutorial.html', 'docs'),
    R('MySQL 8.0: Transactions', 'https://dev.mysql.com/doc/refman/8.0/en/commit.html', 'docs', 'intermediate'),
    R('SQLBolt: interactive SQL lessons', 'https://sqlbolt.com/', 'interactive'),
  ],
  'database-design': [
    R('MySQL 8.0: Foreign key constraints', 'https://dev.mysql.com/doc/refman/8.0/en/create-table-foreign-keys.html', 'docs', 'intermediate'),
    R('Database normalization explained (Microsoft)', 'https://learn.microsoft.com/en-us/office/troubleshoot/access/database-normalization-description', 'docs'),
    R('Guru99: Database design tutorial', 'https://www.guru99.com/database-design.html', 'docs'),
  ],
  'git-github': [
    R('Pro Git book (free)', 'https://git-scm.com/book/en/v2', 'docs'),
    R('Learn Git Branching', 'https://learngitbranching.js.org/', 'interactive'),
    R('GitHub Docs: Get started', 'https://docs.github.com/en/get-started', 'docs'),
  ],
  'linux-basics': [
    R('Linux Journey', 'https://linuxjourney.com/', 'course'),
    R("Ryan's Linux tutorial", 'https://ryanstutorials.net/linuxtutorial/', 'docs'),
    R('Bash scripting tutorial', 'https://ryanstutorials.net/bash-scripting-tutorial/', 'docs', 'intermediate'),
  ],
  'docker-basics': [
    R('Docker: Get started', 'https://docs.docker.com/get-started/', 'docs'),
    R('Docker: Dockerfile reference', 'https://docs.docker.com/reference/dockerfile/', 'docs', 'intermediate'),
    R('Docker: Compose overview', 'https://docs.docker.com/compose/', 'docs', 'intermediate'),
  ],
  'testing-debugging': [
    R('Chrome DevTools documentation', 'https://developer.chrome.com/docs/devtools/', 'docs'),
    R('Node.js test runner', 'https://nodejs.org/api/test.html', 'docs', 'intermediate'),
    R('pytest: Getting started', 'https://docs.pytest.org/en/stable/getting-started.html', 'docs'),
  ],
  'data-structures': [
    R('VisuAlgo: visualise data structures', 'https://visualgo.net/en', 'interactive'),
    R('Programiz: DSA tutorial', 'https://www.programiz.com/dsa', 'docs'),
    R('GeeksforGeeks: Data structures', 'https://www.geeksforgeeks.org/data-structures/', 'docs', 'intermediate'),
  ],
  algorithms: [
    R('VisuAlgo: sorting and searching', 'https://visualgo.net/en/sorting', 'interactive'),
    R('Khan Academy: Algorithms', 'https://www.khanacademy.org/computing/computer-science/algorithms', 'course'),
    R('LeetCode: Explore', 'https://leetcode.com/explore/', 'practice', 'intermediate'),
  ],
  oop: [
    R('Python tutorial: Classes', 'https://docs.python.org/3/tutorial/classes.html', 'docs'),
    R('MDN: Object-oriented programming', 'https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Objects', 'docs'),
    R('dev.java: Learn object-oriented programming', 'https://dev.java/learn/oop/', 'course', 'intermediate'),
  ],
  'problem-solving': [
    R('Exercism: practice by track', 'https://exercism.org/', 'practice'),
    R('HackerRank: Problem solving', 'https://www.hackerrank.com/domains/algorithms', 'practice'),
    R('LeetCode: Problem set', 'https://leetcode.com/problemset/', 'practice', 'intermediate'),
  ],
  statistics: [
    R('Khan Academy: Statistics and probability', 'https://www.khanacademy.org/math/statistics-probability', 'course'),
    R('Seeing Theory: visual introduction', 'https://seeing-theory.brown.edu/', 'interactive'),
    R('OpenIntro Statistics (free textbook)', 'https://www.openintro.org/book/os/', 'docs', 'intermediate'),
  ],
  excel: [
    R('Microsoft Excel help and learning', 'https://support.microsoft.com/en-us/excel', 'docs'),
    R('Exceljet: formulas and functions', 'https://exceljet.net/', 'docs'),
    R('Microsoft: Create a PivotTable', 'https://support.microsoft.com/en-us/office/create-a-pivottable-to-analyze-worksheet-data-a9a84538-bfe9-40a9-a8e9-f99134456576', 'docs', 'intermediate'),
  ],
  'pandas-numpy': [
    R('pandas: 10 minutes to pandas', 'https://pandas.pydata.org/docs/user_guide/10min.html', 'docs'),
    R('NumPy: absolute beginners guide', 'https://numpy.org/doc/stable/user/absolute_beginners.html', 'docs'),
    R('Kaggle Learn: Pandas', 'https://www.kaggle.com/learn/pandas', 'practice'),
  ],
  'data-visualization': [
    R('Kaggle Learn: Data visualization', 'https://www.kaggle.com/learn/data-visualization', 'practice'),
    R('Matplotlib tutorials', 'https://matplotlib.org/stable/tutorials/index.html', 'docs', 'intermediate'),
    R('D3: Getting started', 'https://d3js.org/getting-started', 'docs', 'intermediate'),
  ],
  'data-cleaning': [
    R('Kaggle Learn: Data cleaning', 'https://www.kaggle.com/learn/data-cleaning', 'practice'),
    R('pandas: Working with missing data', 'https://pandas.pydata.org/docs/user_guide/missing_data.html', 'docs'),
    R('pandas: 10 minutes to pandas', 'https://pandas.pydata.org/docs/user_guide/10min.html', 'docs'),
  ],
  'maths-for-ml': [
    R('Khan Academy: Linear algebra', 'https://www.khanacademy.org/math/linear-algebra', 'course'),
    R('3Blue1Brown: Essence of linear algebra', 'https://www.3blue1brown.com/topics/linear-algebra', 'video'),
    R('Mathematics for Machine Learning (free book)', 'https://mml-book.github.io/', 'docs', 'intermediate'),
  ],
  'ml-basics': [
    R('Google: Machine Learning Crash Course', 'https://developers.google.com/machine-learning/crash-course', 'course'),
    R('Kaggle Learn: Intro to machine learning', 'https://www.kaggle.com/learn/intro-to-machine-learning', 'practice'),
    R('Kaggle Learn: Intermediate machine learning', 'https://www.kaggle.com/learn/intermediate-machine-learning', 'practice', 'intermediate'),
  ],
  'scikit-learn': [
    R('scikit-learn: Getting started', 'https://scikit-learn.org/stable/getting_started.html', 'docs'),
    R('scikit-learn: User guide', 'https://scikit-learn.org/stable/user_guide.html', 'docs', 'intermediate'),
    R('Kaggle Learn: Intro to machine learning', 'https://www.kaggle.com/learn/intro-to-machine-learning', 'practice'),
  ],
  'model-evaluation': [
    R('scikit-learn: Model evaluation', 'https://scikit-learn.org/stable/modules/model_evaluation.html', 'docs', 'intermediate'),
    R('scikit-learn: Cross-validation', 'https://scikit-learn.org/stable/modules/cross_validation.html', 'docs', 'intermediate'),
    R('Google ML Crash Course: Classification metrics', 'https://developers.google.com/machine-learning/crash-course/classification', 'course'),
  ],
  'deep-learning-basics': [
    R('3Blue1Brown: Neural networks', 'https://www.3blue1brown.com/topics/neural-networks', 'video'),
    R('Kaggle Learn: Intro to deep learning', 'https://www.kaggle.com/learn/intro-to-deep-learning', 'practice'),
    R('DeepLearning.AI', 'https://www.deeplearning.ai/', 'course', 'intermediate'),
  ],
  communication: [
    R('Google: Technical Writing One', 'https://developers.google.com/tech-writing/one', 'course'),
    R('Google Engineering Practices: Code review', 'https://google.github.io/eng-practices/review/', 'docs', 'intermediate'),
    R('Google: Technical Writing Two', 'https://developers.google.com/tech-writing/two', 'course', 'intermediate'),
  ],
};

module.exports = { BANK };
