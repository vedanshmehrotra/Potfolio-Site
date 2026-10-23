'use strict';
// One-time, source-backed content import. Live editing stays in the CMS.
const project=(id,title,order,fields)=>({id,slug:id,title,status:'published',preview:false,sortOrder:order,coverImage:`./assets/projects/${id}-cover.svg`,gallery:[],repositoryUrl:null,liveUrl:null,featured:order===0,...fields});
const milestone=(id,title,date,kind,summary,description,sortOrder)=>({id,title,date,kind,summary,description,sortOrder,status:'published',preview:false,result:null,imageUrl:null,imageAlt:''});
const badge=(key,title,id,topic,body,sortOrder)=>({id:`aws-${key}`,title,credentialType:'training-badge',issuer:'Amazon Web Services Training and Certification',issuedAt:'May 2026',credentialId:id,category:topic,summary:'AWS Educate training badge',body,sourceUrl:`https://www.credly.com/badges/${id}`,imageUrl:`./assets/credentials/aws-${key}.png`,imageAlt:`${title} training badge`,certificateUrl:null,sortOrder,status:'published',preview:false});
const course=(id,title,issuer,type,category,sortOrder)=>({id,title,issuer,credentialType:type,category,issuedAt:'',credentialId:'',summary:'Coursework listed in my resume.',body:'',sourceUrl:null,imageUrl:null,imageAlt:'',certificateUrl:null,sortOrder,status:'draft',preview:false});
module.exports={
  projects:[
    project('pathforge','PathForge',0,{
      shortSummary:'Understand your code.',tags:['Python','Code analysis'],
      technologies:['Python','FastAPI','Next.js','React','PostgreSQL','Supabase Auth','TypeScript','Python AST'],
      problem:'Passing tests is only part of learning an algorithm. PathForge helps you see the structure in a Python solution, compare approaches and keep track of practice.',
      highlights:[{title:'Inspect',body:'Spot algorithmic patterns in Python code.'},{title:'Compare',body:'See alternative approaches side by side.'},{title:'Practise',body:'Keep a record of problems and progress.'}],
      flow:['Choose a problem','Inspect Python','Compare approaches','Save practice'],
      approach:'The code structure drives the analysis. The interface keeps the explanation close to the solution.',
      technicalNotes:[{title:'Structure over keywords',body:'AST detectors inspect loops, state changes and index relationships.'},{title:'Separate responsibilities',body:'Next.js presents the results; FastAPI handles analysis and problem data.'},{title:'Practice that persists',body:'PostgreSQL stores practice history behind Supabase authentication.'}],
      outcomes:'Public application and source repository.\nDetector tests and evaluation fixtures are included in the repository.',
      repositoryUrl:'https://github.com/vedanshmehrotra/PathForge-v2',liveUrl:'https://path-forge-v2.vercel.app/',
      gallery:[{url:'./assets/projects/pathforge-product.png',alt:'Public landing page · PathForge'},{url:'./assets/projects/pathforge-inspect.png',alt:'Inspect · interactive product-tour example'},{url:'./assets/projects/pathforge-compare.png',alt:'Compare · interactive product-tour example'},{url:'./assets/projects/pathforge-practise.png',alt:'Practise · interactive product-tour example'}]
    }),
    project('resolveflow','ResolveFlow',1,{
      shortSummary:'Route complaints.',tags:['ML','Operations'],
      technologies:['Python','Flask','Scikit-learn','TensorFlow / Keras','SQLite','NLP','HTML / CSS'],
      problem:'One hostel complaint can involve several teams. ResolveFlow identifies the issues and urgency, then routes the work with staff review where needed.',
      highlights:[{title:'Multi-issue intake',body:'Handle more than one problem in a message.'},{title:'Human review',body:'Review uncertain routing before assignment.'},{title:'Team inboxes',body:'Follow the work through to resolution.'}],
      flow:['Submit complaint','Classify issues','Review routing','Assign a team'],
      approach:'Text classification supports the workflow; staff keep control of the final assignment.',
      technicalNotes:[{title:'Confidence-aware routing',body:'Confidence bands separate automatic assignments from the review queue.'},{title:'A manual path',body:'Staff can approve or override suggested team assignments.'},{title:'Operational follow-through',body:'Team inboxes, SLA tracking and an audit trail connect triage to the work.'}],
      outcomes:'Audit-history screenshot supplied from the application.\nIntake and review interface previews use sample data.',
      gallery:[{url:'./assets/projects/resolveflow-audit.png',alt:'Audit history · application screenshot supplied by me'},{url:'./assets/projects/resolveflow-intake.png',alt:'Student complaint form · interface preview'},{url:'./assets/projects/resolveflow-review.png',alt:'Staff review queue · interface preview with sample data'}],
      repositoryUrl:'https://github.com/vedanshmehrotra/ResolveFlow'
    }),
    project('automated-cicd-framework','Automated CI/CD Framework',2,{
      shortSummary:'Deploy & recover.',tags:['AWS','CI/CD'],
      technologies:['GitHub Actions','Docker','Amazon ECR','Amazon EC2','AWS Systems Manager Parameter Store','Amazon CloudWatch','Amazon SNS','AWS IAM / OIDC','Flask','PostgreSQL'],
      problem:'A successful build is not a healthy release. This framework automates Flask deployments on AWS and checks the application after it reaches the server.',
      highlights:[{title:'Traceable releases',body:'Docker images tagged with the commit.'},{title:'Health verification',body:'Check application, database and version.'},{title:'Recovery path',body:'Return to the last stable image.'}],
      flow:['Test & build','Push to ECR','Deploy to EC2','Check & recover'],
      approach:'Built at Think Computers to replace repeated manual Flask releases with a test, deploy and recovery workflow.',
      technicalNotes:[{title:'Trace each release',body:'GitHub Actions tests the app and pushes a Docker image to ECR tagged with its commit SHA.'},{title:'Recover on failure',body:'After an EC2 release, /health checks the app and database. Failed verification restores the stable image recorded in Parameter Store.'},{title:'Secure and observe',body:'IAM/OIDC authorizes GitHub Actions; Parameter Store holds configuration. CloudWatch and SNS provide monitoring and alerts.'}],
      outcomes:'Developed at Think Computers during my Cloud & DevOps internship.\nOriginal presentation slides document the deployment and rollback workflow.',
      gallery:[{url:'./assets/projects/cicd-release-map.svg',alt:'Release and recovery architecture · illustrated from the implementation'},{url:'./assets/projects/cicd-internship-overview.png',alt:'Project overview · original internship presentation slide 6'},{url:'./assets/projects/cicd-internship-workflow.png',alt:'Deployment, monitoring and rollback · original internship presentation slide 8'}]
    }),
    project('planease','PlanEase',3,{
      shortSummary:'Tasks & notes.',tags:['Backend','Productivity'],
      technologies:['Node.js','Express','MongoDB','Mongoose','JWT','HTML / CSS','JavaScript'],
      problem:'A personal workspace for the things you need to do and remember. PlanEase brings tasks, priorities and notes together behind an account.',
      highlights:[{title:'Tasks',body:'Organise by category, tags and priority.'},{title:'Notes',body:'Keep details alongside the work.'},{title:'Your workspace',body:'Account-scoped tasks and notes.'}],
      flow:['Sign in','Plan a task','Keep a note','Track completion'],
      approach:'A small full-stack application connecting a browser dashboard to persistent data.',
      technicalNotes:[{title:'An explicit API',body:'Express routes handle creating, reading, updating and deleting tasks and notes.'},{title:'Account-scoped queries',body:'JWT identifies the account; database queries include that user ID.'},{title:'Persistent records',body:'Mongoose models store tasks and notes in MongoDB.'}],
      outcomes:'Frontend, authentication and task/note endpoints are available in the repository.\nThe dashboard preview uses the original interface with sample data.',
      gallery:[{url:'./assets/projects/planease-dashboard.png',alt:'PlanEase dashboard · interface preview with sample data'}],
      repositoryUrl:'https://github.com/vedanshmehrotra/PlanEase'
    })
  ],
  about:{
    title:'About Me',role:'Backend · Cloud · Applied AI',status:'published',
    bio:'I enjoy the work behind an application: APIs, cloud deployments, and recovering when a release goes wrong. I also build ML and code-analysis tools.',
    focus:['What broke after deploy?','When does a model guess?'],
    toolkit:['Robotics Club · events','Learning by building'],
    note:'Vedansh Mehrotra · building, testing, learning',
    links:[{label:'GitHub',url:'https://github.com/vedanshmehrotra'},{label:'LinkedIn',url:'https://www.linkedin.com/in/vedansh-mehrotra-05b41331b/'}]
  },
  journey:[
    milestone('university','University','2024 — present','education','B.Tech in AI & ML at Universal AI University.','Starting university gave me a place to explore software, machine learning and the systems behind practical applications.',0),
    milestone('airbornehrs','Backend internship','Jun — Aug 2025','experience','Backend Developer Intern at AirBorneHRS.','Worked on REST APIs, validation, access control and relational data flows for an HRMS platform using Supabase Postgres. Employee, performance and task modules connected the backend work to day-to-day organisational workflows.',1),
    milestone('robotics-club','Robotics Club',null,'achievement','General Secretary · organising events and collaborating across teams.','Leading robotics events added a different kind of engineering experience: coordinating people, preparing activities and helping student teams work together.',2),
    milestone('think-computers','Cloud & DevOps internship','Apr — Jul 2026','experience','Software Development Intern at Think Computers.','Built deployment automation for Flask applications with GitHub Actions, Docker, ECR and EC2, including health verification and rollback. Also worked on an AI-assisted serverless log-analysis pipeline using API Gateway, Lambda, DynamoDB and SNS.',3),
    {...milestone('academic-recognition','Academic recognition',null,'achievement','Among the top 10 students in my cohort by CGPA for two academic years.','A milestone in keeping my academic work consistent alongside practical software development and student responsibilities.',4),result:'Top 10 · cohort CGPA'}
  ],
  resume:{
    name:'Vedansh Mehrotra',role:'Backend · Cloud · Applied AI',status:'published',preview:false,
    downloadUrl:'./assets/Vedansh-Mehrotra-CV.pdf',downloadName:'Vedansh-Mehrotra-CV.pdf',
    sections:[
      {id:'profile',title:'Profile',entries:[{heading:'Building beyond the prototype',body:['AI & ML undergraduate at Universal AI University, with experience in backend services, AWS deployment automation and applied machine learning.','My work includes API and database integration, container-based delivery, health verification and code-analysis tools.']}]},
      {id:'experience',title:'Experience',entries:[
        {heading:'Think Computers',meta:'Software Development Intern · Cloud & DevOps · Apr — Jul 2026',body:['Built a reusable CI/CD workflow for Flask applications using GitHub Actions, Docker, ECR and EC2, including testing, deployment and post-deployment verification.','Implemented health-based rollback using stable image versions in Systems Manager Parameter Store.','Designed an AI-assisted serverless log-analysis pipeline using API Gateway, Lambda, DynamoDB and SNS.']},
        {heading:'AirBorneHRS',meta:'Backend Developer Intern · Jun — Aug 2025',body:['Contributed REST APIs for employee, performance and task management in a full-stack HRMS platform.','Worked with Supabase Postgres data models, API validation, access controls and query flows across development and staging.']}
      ]},
      {id:'projects',title:'Projects',entries:[
        {heading:'PathForge',meta:'Python · FastAPI · Next.js · PostgreSQL',body:['Structural analysis of Python solutions using AST-derived evidence, with approach comparisons and saved practice.']},
        {heading:'ResolveFlow',meta:'Python · Flask · ML · SQLite',body:['Hybrid complaint triage with multi-issue classification, review queues, team assignments and human overrides.']},
        {heading:'Automated CI/CD Framework',meta:'AWS · Docker · GitHub Actions',body:['Reusable Flask deployment automation with release health checks and a stable-version rollback path.']},
        {heading:'PlanEase',meta:'Node.js · Express · MongoDB',body:['An account-based task and note workspace with authenticated CRUD endpoints and a browser dashboard.']}
      ]},
      {id:'education',title:'Education',entries:[{heading:'Universal AI University',meta:'B.Tech in AI & ML · 2024 — present · Mumbai',body:['Undergraduate study in artificial intelligence and machine learning.']}]},
      {id:'skills',title:'Skills & training',entries:[
        {heading:'Backend & data',body:['Python, C++ and Java. Flask, FastAPI, REST APIs, PostgreSQL, Supabase and MongoDB.']},
        {heading:'Cloud & delivery',body:['AWS: EC2, ECR, Systems Manager Parameter Store, Lambda, API Gateway, DynamoDB and SNS. Docker, GitHub Actions and CI/CD.']},
        {heading:'Learning & credentials',body:['AWS Educate training: Cloud 101, databases, networking, serverless, storage and cloud operations. Individual verification links are on the certification shelf.','Additional coursework listed in the downloadable CV includes DataCamp, Google Cloud and edX.']}
      ]},
      {id:'activities',title:'Beyond the code',entries:[{heading:'Robotics Club',meta:'General Secretary',body:['Led and organised robotics events, coordinating participants and collaboration across student teams.']},{heading:'Academic recognition',body:['Ranked among the top 10 students in my cohort by CGPA for two consecutive academic years.']}]}
    ]
  },
  notes:[
    badge('cloud-101','AWS Educate Introduction to Cloud 101','dc5cc7e2-43b7-4269-a292-df03e81e655c','CLOUD FOUNDATIONS','Foundational AWS Educate training in cloud computing concepts and services.',0),
    badge('serverless','AWS Educate Getting Started with Serverless','8b0f076c-ba45-4dad-a0bd-c5cb3c069363','SERVERLESS','Introductory AWS Educate training focused on serverless computing.',1),
    badge('databases','AWS Educate Getting Started with Databases','7ae36444-b423-437d-9f11-39209e50fc3a','DATABASES','Introductory AWS Educate training focused on cloud database services.',2),
    badge('networking','AWS Educate Getting Started with Networking','4aaa03af-5e06-49ae-8ba3-94ac4cca1418','NETWORKING','Introductory AWS Educate training focused on cloud networking.',3),
    badge('cloud-operations','AWS Educate Getting Started with Cloud Ops','9ce00280-8352-440d-9123-435fb3cadfcd','CLOUD OPERATIONS','Introductory AWS Educate training focused on operating cloud resources.',4),
    badge('storage','AWS Educate Getting Started with Storage','c9f3aafc-9d26-4bc8-b0b7-f115dd821887','STORAGE','Introductory AWS Educate training focused on cloud storage.',5),
    course('google-vertex-ai','Prompt Design in Vertex AI','Google Cloud','skill-badge','APPLIED AI',6),
    course('datacamp-prompt-engineering','Prompt Engineering','DataCamp','course-certificate','APPLIED AI',7),
    course('datacamp-excel','Excel for Data Analysis','DataCamp','course-certificate','DATA ANALYSIS',8),
    {...course('edx-sustainable-development','Sustainable Development: The Post-Capitalist Order','SDGAcademyX · edX','course-certificate','SUSTAINABILITY',9),status:'published',issuedAt:'16 January 2025',credentialId:'7ceeabda2ff14749b8694c877aae928b',summary:'edX verified course certificate',body:'Completed Sustainable Development: The Post-Capitalist Order, offered by SDG Academy through edX.',sourceUrl:'https://courses.edx.org/certificates/7ceeabda2ff14749b8694c877aae928b'},
    course('edx-carbon-capture','Carbon Capture & Storage','edX','course-certificate','SUSTAINABILITY',10)
  ]
};
