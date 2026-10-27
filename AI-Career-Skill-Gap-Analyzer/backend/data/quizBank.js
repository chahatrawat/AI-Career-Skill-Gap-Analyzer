'use strict';

/**
 * Curated quiz questions, keyed by skill slug (see seed.sql).
 * Each skill has 3 questions, easiest first: [question, [options], indexOfCorrectOption].
 * Answers are checked on the server only; they are never sent to the browser.
 */

const BANK = {
  python: [
    ['Which of these creates a list in Python?', ['{1, 2, 3}', '[1, 2, 3]', '(1, 2, 3)', '<1, 2, 3>'], 1],
    ['What does `len({"a": 1, "b": 2})` return?', ['1', '2', '4', 'It raises an error'], 1],
    ['What is the main purpose of a Python generator (a function that uses `yield`)?', ['To produce values lazily, one at a time', 'To make a function run in parallel', 'To encrypt return values', 'To define a class without a constructor'], 0],
  ],
  javascript: [
    ['Which keyword declares a block-scoped variable that can be reassigned?', ['var', 'let', 'const', 'static'], 1],
    ['What does `[1, 2, 3].map(n => n * 2)` return?', ['6', '[2, 4, 6]', '[1, 2, 3]', 'undefined'], 1],
    ['What does `await` do inside an `async` function?', ['Pauses that function until the promise settles, without blocking other code', 'Blocks the whole browser until it finishes', 'Converts a promise into a callback', 'Runs the function on another thread'], 0],
  ],
  typescript: [
    ['What is TypeScript?', ['A superset of JavaScript that adds static types', 'A replacement for HTML', 'A database query language', 'A CSS preprocessor'], 0],
    ['What does `let id: number | string` mean?', ['id can hold a number or a string', 'id must hold both a number and a string', 'id is an array', 'id is optional'], 0],
    ['What is the purpose of a generic such as `function first<T>(items: T[]): T`?', ['To keep the type information of the input in the output', 'To make the function run faster', 'To allow any value without type checking', 'To import types from another file'], 0],
  ],
  html: [
    ['Which element is the largest standard heading?', ['<h6>', '<head>', '<h1>', '<header>'], 2],
    ['Which attribute gives an image text for screen readers?', ['title', 'alt', 'src', 'name'], 1],
    ['Why prefer `<button>` over a clickable `<div>`?', ['It is keyboard focusable and announced as a button by default', 'It loads faster', 'It cannot be styled', 'It works without JavaScript on every page'], 0],
  ],
  css: [
    ['Which property changes the text colour?', ['font-color', 'text-style', 'color', 'foreground'], 2],
    ['What does `display: flex` on a container enable?', ['Flexible one-dimensional layout of its children', 'Hides the container', 'Makes text bold', 'Fixes the container to the screen'], 0],
    ['Which selector has the highest specificity?', ['p', '.note', '#intro', 'p.note'], 2],
  ],
  react: [
    ['What is a React component?', ['A reusable piece of UI, usually a function returning JSX', 'A database table', 'A CSS file', 'A server route'], 0],
    ['Which hook stores state in a function component?', ['useEffect', 'useState', 'useRef only', 'useRoute'], 1],
    ['Why does React ask for a stable `key` on list items?', ['To match items between renders efficiently and correctly', 'To sort the list', 'To encrypt the items', 'To make items clickable'], 0],
  ],
  'responsive-design': [
    ['Which meta tag is needed for responsive layouts on phones?', ['viewport', 'charset', 'robots', 'author'], 0],
    ['What does a CSS media query like `@media (max-width: 600px)` do?', ['Applies rules only when the viewport is 600px wide or less', 'Limits images to 600px', 'Loads a second page', 'Sets the maximum font size'], 0],
    ['What does "mobile-first" mean?', ['Write base styles for small screens, then add rules for larger ones', 'Only support phones', 'Build the native app first', 'Hide desktop content'], 0],
  ],
  nodejs: [
    ['What is Node.js?', ['A JavaScript runtime that runs outside the browser', 'A CSS framework', 'A relational database', 'A browser extension'], 0],
    ['Which module system does `require()` belong to?', ['CommonJS', 'ES modules', 'AMD only', 'TypeScript'], 0],
    ['Why should you avoid long synchronous CPU work on the Node.js main thread?', ['It blocks the event loop so other requests wait', 'It uses more disk space', 'It is not allowed by the language', 'It disables npm'], 0],
  ],
  expressjs: [
    ['In Express, what does `app.get("/users", handler)` define?', ['A handler for GET requests to /users', 'A database query', 'A static file folder', 'A middleware that runs on every route'], 0],
    ['What is middleware in Express?', ['A function that can read or change the request/response and call next()', 'A database driver', 'A template language', 'A kind of route file'], 0],
    ['Where should a centralised error-handling middleware be registered?', ['After all routes, with four parameters (err, req, res, next)', 'Before any routes', 'Inside each route only', 'In package.json'], 0],
  ],
  'rest-apis': [
    ['Which HTTP method is normally used to read a resource without changing it?', ['POST', 'GET', 'DELETE', 'PUT'], 1],
    ['Which status code means "resource created"?', ['200', '201', '301', '404'], 1],
    ['What does it mean that a PUT request should be idempotent?', ['Repeating it gives the same result as sending it once', 'It must be encrypted', 'It can only be sent once', 'It never returns a body'], 0],
  ],
  'authentication-security': [
    ['How should passwords be stored?', ['As salted hashes (for example bcrypt)', 'In plain text', 'Encrypted with a key kept next to them', 'Base64-encoded'], 0],
    ['What does parameterised SQL (placeholders) protect against?', ['SQL injection', 'Slow queries', 'Missing indexes', 'Cross-origin requests'], 0],
    ['Why must a JWT secret never be committed to a public repository?', ['Anyone with it can forge valid tokens', 'It makes the repo too large', 'It expires the tokens early', 'It breaks CORS'], 0],
  ],
  sql: [
    ['Which clause filters rows?', ['ORDER BY', 'WHERE', 'GROUP BY', 'LIMIT'], 1],
    ['What does `JOIN` do?', ['Combines rows from two tables using a related column', 'Deletes duplicate rows', 'Creates an index', 'Renames a column'], 0],
    ['Which statement is true about `HAVING`?', ['It filters groups after GROUP BY aggregation', 'It filters rows before grouping', 'It sorts the result', 'It is the same as LIMIT'], 0],
  ],
  mysql: [
    ['Which command shows the tables in the current MySQL database?', ['SHOW TABLES;', 'LIST TABLES;', 'DESCRIBE DATABASE;', 'GET TABLES;'], 0],
    ['What does AUTO_INCREMENT do on a column?', ['Generates the next integer value automatically for new rows', 'Adds 1 to every row on each query', 'Makes the column optional', 'Encrypts the column'], 0],
    ['Why use a transaction for a multi-step update?', ['So all steps succeed together or none are applied', 'To make queries faster', 'To avoid using indexes', 'To back up the database'], 0],
  ],
  'database-design': [
    ['What uniquely identifies a row in a table?', ['Primary key', 'Foreign key', 'Index name', 'View'], 0],
    ['What does a foreign key do?', ['Links a row to a row in another table', 'Encrypts a column', 'Speeds up every query', 'Stores a password'], 0],
    ['How is a many-to-many relationship usually modelled?', ['With a join (link) table holding both keys', 'By repeating values in one column', 'With a single foreign key', 'It cannot be modelled'], 0],
  ],
  'git-github': [
    ['Which command records staged changes in the history?', ['git push', 'git commit', 'git clone', 'git fetch'], 1],
    ['What is a branch used for?', ['An isolated line of work that can be merged later', 'A backup of the .git folder', 'A remote server', 'A faster commit'], 0],
    ['What does a pull request let a team do?', ['Review and discuss changes before merging them', 'Download a repository', 'Delete a remote branch automatically', 'Rewrite history'], 0],
  ],
  'linux-basics': [
    ['Which command lists files in a directory?', ['ls', 'cd', 'rm', 'pwd'], 0],
    ['What does `chmod +x script.sh` do?', ['Makes the file executable', 'Deletes the file', 'Changes its owner', 'Compresses it'], 0],
    ['What does the pipe in `cat log.txt | grep ERROR` do?', ['Sends the output of cat to grep as input', 'Writes output to a file', 'Runs both commands at the same time on different files', 'Comments out the command'], 0],
  ],
  'docker-basics': [
    ['What is a container image?', ['A read-only template used to start containers', 'A running virtual machine', 'A database backup', 'A network cable'], 0],
    ['Which file describes how to build an image?', ['Dockerfile', 'package.json', 'docker.txt', 'compose.lock'], 0],
    ['What is a volume used for?', ['Keeping data outside the container\'s disposable filesystem', 'Increasing CPU speed', 'Hiding ports', 'Naming containers'], 0],
  ],
  'testing-debugging': [
    ['What is the first useful step when you meet a bug?', ['Reproduce it reliably', 'Rewrite the module', 'Ignore it', 'Deploy a fix'], 0],
    ['What is a unit test?', ['A test of one small piece of code in isolation', 'A test of the whole system with real users', 'A load test', 'A visual design review'], 0],
    ['Why can a test that passes sometimes and fails sometimes be a problem?', ['It is flaky, so nobody can trust its result', 'It runs too fast', 'It proves the code is correct', 'It cannot be fixed'], 0],
  ],
  'data-structures': [
    ['Which structure is last-in, first-out?', ['Queue', 'Stack', 'Array of strings', 'Set'], 1],
    ['What is the average lookup time of a hash table?', ['O(1)', 'O(n)', 'O(n log n)', 'O(n^2)'], 0],
    ['Which structure fits "process tasks in the order they arrived"?', ['Queue', 'Stack', 'Binary tree', 'Hash set'], 0],
  ],
  algorithms: [
    ['Binary search requires the data to be...', ['Sorted', 'Unique', 'Stored in a tree', 'Numeric only'], 0],
    ['What is the time complexity of binary search?', ['O(log n)', 'O(n)', 'O(1)', 'O(n^2)'], 0],
    ['What is the idea behind dynamic programming?', ['Store results of overlapping subproblems so they are computed once', 'Run the program in parallel', 'Always pick the locally best choice', 'Randomise the input'], 0],
  ],
  oop: [
    ['What is a class?', ['A blueprint for creating objects', 'A kind of loop', 'A database table', 'A file format'], 0],
    ['What is encapsulation?', ['Hiding internal state behind a controlled interface', 'Copying a class', 'Running code in a sandbox', 'Splitting code into files'], 0],
    ['What does polymorphism allow?', ['Different classes to be used through the same interface', 'A class to have only one object', 'Code to run without a compiler', 'Variables without types'], 0],
  ],
  'problem-solving': [
    ['What is a good first step with a large, unfamiliar problem?', ['Restate it and break it into smaller parts', 'Start coding immediately', 'Search for the full solution', 'Wait for hints'], 0],
    ['Why trace a small example by hand before coding?', ['It exposes misunderstandings and edge cases early', 'It replaces testing', 'It makes the code shorter', 'It is required by compilers'], 0],
    ['Your solution is correct but too slow on big inputs. What should you do?', ['Find the bottleneck and choose a better algorithm or data structure', 'Remove the tests', 'Add more comments', 'Run it twice'], 0],
  ],
  statistics: [
    ['The median of 1, 3, 3, 6, 7, 8, 9 is...', ['3', '6', '7', '5.3'], 1],
    ['Which measure is least affected by extreme outliers?', ['Mean', 'Median', 'Range', 'Sum'], 1],
    ['A small p-value in a hypothesis test suggests...', ['The observed data would be unlikely if the null hypothesis were true', 'The null hypothesis is certainly false', 'The effect is large', 'The sample is biased'], 0],
  ],
  excel: [
    ['Which formula adds the values in A1 to A10?', ['=SUM(A1:A10)', '=ADD(A1,A10)', '=TOTAL(A1-A10)', '=A1+A10 only'], 0],
    ['What does VLOOKUP do?', ['Looks up a value in the first column of a range and returns a value from another column', 'Validates a cell', 'Creates a chart', 'Sorts a table'], 0],
    ['What is a pivot table used for?', ['Summarising and grouping data interactively', 'Protecting a sheet', 'Importing images', 'Spell checking'], 0],
  ],
  'pandas-numpy': [
    ['Which library provides the DataFrame?', ['NumPy', 'pandas', 'Matplotlib', 'requests'], 1],
    ['What does `df.dropna()` do?', ['Removes rows containing missing values', 'Drops the whole DataFrame', 'Fills missing values with 0', 'Sorts the rows'], 0],
    ['What is "broadcasting" in NumPy?', ['Applying operations between arrays of different shapes without explicit loops', 'Sending arrays over a network', 'Printing arrays', 'Saving arrays to disk'], 0],
  ],
  'data-visualization': [
    ['Which chart best shows a trend over time?', ['Line chart', 'Pie chart', 'Word cloud', 'Scatter of random points'], 0],
    ['Why is a truncated y-axis on a bar chart misleading?', ['It exaggerates differences between bars', 'It hides the title', 'It changes the colours', 'It removes the legend'], 0],
    ['Which is the best use of colour in a chart?', ['Highlight what matters and keep the rest muted', 'Give every bar a different bright colour', 'Use red and green only', 'Use as many colours as possible'], 0],
  ],
  'data-cleaning': [
    ['Which is an example of dirty data?', ['Duplicate rows and inconsistent spellings', 'A clear header row', 'Numeric IDs', 'A date column'], 0],
    ['Which is a common way to handle missing numeric values?', ['Impute with the median, or drop the rows, depending on context', 'Always replace with 0', 'Ignore them', 'Delete the column always'], 0],
    ['Why keep the raw data unchanged and script your cleaning steps?', ['So the process is repeatable and auditable', 'To save disk space', 'To avoid learning Python', 'To hide errors'], 0],
  ],
  'maths-for-ml': [
    ['What is a vector?', ['An ordered list of numbers', 'A single image', 'A probability', 'A type of loop'], 0],
    ['What does the gradient of a loss function tell us?', ['The direction of steepest increase', 'The final accuracy', 'The number of samples', 'The learning rate'], 0],
    ['What is the dot product of [1, 2, 3] and [4, 5, 6]?', ['32', '15', '21', '6'], 0],
  ],
  'ml-basics': [
    ['Which is a supervised learning task?', ['Predicting house prices from labelled examples', 'Grouping customers with no labels', 'Compressing images', 'Sorting a list'], 0],
    ['Why split data into training and test sets?', ['To measure performance on data the model has not seen', 'To make training faster', 'To reduce the number of features', 'To remove outliers'], 0],
    ['What is overfitting?', ['The model memorises training data and generalises poorly', 'The model is too simple', 'The data has too few rows', 'Training stops early'], 0],
  ],
  'scikit-learn': [
    ['Which method trains a scikit-learn model?', ['fit()', 'train_all()', 'learn()', 'start()'], 0],
    ['What does `train_test_split` do?', ['Splits data into training and testing subsets', 'Trains two models', 'Scales the features', 'Removes duplicates'], 0],
    ['What is the benefit of a scikit-learn Pipeline?', ['Chains preprocessing and a model so the same steps apply at train and predict time', 'It makes any model more accurate', 'It stores data in a database', 'It plots results'], 0],
  ],
  'model-evaluation': [
    ['Which metric is common for classification?', ['Accuracy', 'Mean absolute error', 'R-squared only', 'Bandwidth'], 0],
    ['When is accuracy a poor metric?', ['With heavily imbalanced classes', 'With balanced classes', 'With small models', 'With text data only'], 0],
    ['What does cross-validation provide?', ['A more reliable estimate of performance by rotating validation folds', 'Faster training', 'More features', 'Automatic labelling'], 0],
  ],
  'deep-learning-basics': [
    ['What is a neural network layer made of?', ['Neurons that apply weights, a bias and an activation', 'Rows of a database', 'HTML elements', 'Git commits'], 0],
    ['What is the role of an activation function such as ReLU?', ['Introduce non-linearity', 'Load the data', 'Choose the batch size', 'Split the dataset'], 0],
    ['What does backpropagation compute?', ['Gradients of the loss with respect to the weights', 'The test accuracy', 'The dataset labels', 'The number of layers'], 0],
  ],
  communication: [
    ['What makes a bug report most useful?', ['Steps to reproduce, expected and actual results', 'A long apology', 'Only the word "broken"', 'A screenshot with no text'], 0],
    ['A stakeholder is non-technical. How should you explain a delay?', ['Plain language: what happened, impact, and the new date', 'Technical jargon to show detail', 'Avoid mentioning it', 'Blame another team'], 0],
    ['In a code review you disagree with a design. What is the best approach?', ['Explain your reasoning and suggest an alternative respectfully', 'Reject without comment', 'Rewrite their code silently', 'Say nothing'], 0],
  ],
};

module.exports = { BANK };
