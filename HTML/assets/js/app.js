(function () {
  'use strict';

  angular.module('resumeApp', [])
    .config(function ($locationProvider) {
      $locationProvider.hashPrefix('');
    })
    .run(function ($document, $timeout) {
      $timeout(function () {
        $document.find('body').removeClass('is-preload');
      }, 100);
    })
    .controller('ResumeController', ResumeController);

  ResumeController.$inject = ['$scope', '$location', '$http', '$window', '$timeout'];

  function ResumeController($scope, $location, $http, $window, $timeout) {
    var vm = this;

    vm.currentSection = null;
    vm.visitorCount = null;
    vm.typewriterPhrases = [
      'Software Developer',
      'Geographer',
      'Consultant',
      'Cloud Solution Architect'
    ];

    vm.sections = [
      { id: 'about', label: 'About' },
      { id: 'experience', label: 'Experience' },
      { id: 'education', label: 'Education' },
      { id: 'skills', label: 'Skills' },
      { id: 'projects', label: 'Projects' },
      { id: 'contact', label: 'Contact' }
    ];

    vm.about = {
      intro: 'I am a Geographer specializing in frontend and backend development for a complex scalable web map app. Want to know how I may help your project? Check out my project portfolio and online resume.',
      cloudResume: {
        title: 'Cloud Resume Challenge',
        subtitle: 'Open Source',
        image: 'assets/images/CloudResumeArchitecture.png',
        alt: 'Cloud Resume Challenge',
        link: '/CloudResumeChallenge.html',
        githubUrl: 'https://github.com/jwitcoski/cloud-resume-challenge-backend',
        siteUrl: 'https://witcoskitech.com',
        screenshotImage: 'assets/images/VectorScopeAI.jpg',
        description: 'This webpage was built to challenge myself to master the cloud by building this website using various AWS components. Read the blog here'
      }
    };

    vm.experience = [
      { title: 'Founder & Principal', org: 'Vector Scope AI LLC', period: 'Remote | October 2025 – Present', description: 'Lead AI-powered geospatial consultancy delivering spatial intelligence solutions for government and enterprise clients. Design cloud-native geospatial ETL pipelines supporting large-scale operational planning and logistics optimization. Architect scalable spatial analytics solutions for petabyte-scale geodata processing. Build automated workflows processing millions of records daily, reducing manual effort by 80%+. Provide technical architecture guidance aligned with FedRAMP security and compliance requirements.', stack: 'AWS, Geospatial ETL, Spatial Analytics, FedRAMP, Python, Cloud-Native Architecture', website: 'https://vectorscopeai.com' },
      { title: 'Geographer', org: 'DRT Solutions / Centers for Disease Control and Prevention', period: 'March 2022 – Current', description: 'Developed interactive security-focused dashboards for public health analysis, enhancing data accessibility while ensuring compliance with federal security standards. Implemented IAM security best practices across cloud infrastructure, ensuring proper authentication and authorization controls. Managed cross-functional teams to deliver complex projects on schedule while addressing security requirements.', stack: 'Microsoft Entra ID, R, ESRI, PowerBI, DAX, Python, D3.JS' },
      { title: 'GIS Data Engineer / Data Conversion Scrum Master', org: 'Saicon/National Grid', period: 'May 2021 – March 2022', description: 'Spearheaded migration of sensitive geospatial data from legacy systems to secure cloud infrastructure in Azure. Designed and implemented robust security protocols for data transmission and storage. Developed and modified SQL scripts for geospatial data analysis with security controls for quality assurance. Managed Scrum processes across multiple teams, ensuring on-time delivery while addressing security concerns.', stack: 'Azure, Python, ArcPy, ESRI, SmallWorld, Infrastructure as Code' },
      { title: 'Geographer', org: 'US Census Bureau', period: 'November 2016 – March 2021', description: 'Managed modification and improvement of Census boundaries following strict security protocols for sensitive data. Developed custom Python tools for secure processing of geographic data, reducing processing time by 30%. Collaborated with cross-functional teams to implement security best practices for geospatial workflows.', stack: 'Oracle, Python, ArcPy, ESRI, QGIS, SQL' },
      { title: 'GIS Systems Administrator / Software Engineer', org: 'C2 Solutions Group Inc.', period: 'May 2014 – November 2016', description: 'Led infrastructure security initiatives for GIS platforms used by sensitive government organizations. Managed installation, configuration, and administration of secure GIS tool suites. Provided technical support and security guidance for ESRI-based GIS systems to ARNG-ILI and ARNG-ILE divisions. Developed and maintained security metrics dashboards for system monitoring. Implemented security controls and best practices across GIS infrastructure.', stack: 'ArcGIS Server, ESRI Portal, ESRI License Manager, Sharepoint, Windows Server, Linux, Python' },
      { title: 'Geospatial Analyst', org: 'Booz Allen Hamilton', period: 'October 2009 – May 2014', description: 'Provided geospatial analysis and mapping for DHS and FEMA security-critical projects. Developed secure geospatial solutions following federal security standards. Led risk assessment initiatives for geospatial infrastructure. Collaborated with security teams to implement controls and safeguards for sensitive location data.', stack: 'Python, ArcGIS, Security Frameworks' },
      { title: 'GIS Specialist', org: 'Tyco Telecommunications', period: '2007 – 2009', description: 'Developed a spatial database of an underwater telecommunication cable, sonar data, and various other information of relevance to the company. Prepared a table, map, and graph for use in the completion of a final report and internal spatial data query.', stack: 'Python, AutoCAD, FME' },
      { title: 'GIS Specialist', org: 'WDG Location Consulting', period: '2007', description: 'Performed spatial analysis for site selection and market research.', stack: null },
      { title: 'GIS Specialist', org: 'Philmont Scout Ranch', period: '2007', description: 'Mapped trails and facilities for one of the largest Scout camps in America.', stack: null },
      { title: 'Intern', org: 'National Geographic Society', period: '2003', description: null, stack: null }
    ];

    vm.education = [
      { degree: 'Master of Science in Geography', school: 'University of Tennessee', period: '2004 - 2007', note: null },
      { degree: 'Bachelor of Arts in Geography and Anthropology', school: 'Penn State University', period: '2000 - 2004', note: 'Minor in Geographic Information Science' }
    ];

    vm.skills = [
      { label: 'AI & Engineering', items: ['GeoAI', 'spatial data engineering', 'Python', 'JavaScript', 'SQL', 'REST APIs', 'ETL automation', 'cloud-native architecture'] },
      { label: 'DevSecOps', items: ['Secure coding', 'Docker', 'Jenkins', 'GitLab', 'CI/CD', 'FedRAMP/FISMA compliance'] },
      { label: 'Platforms', items: ['Wherobots', 'Azure', 'AWS', 'ArcGIS Enterprise', 'PostgreSQL/PostGIS'] },
      { label: 'Leadership', items: ['Agile/Scrum', 'technical project management', 'cross-functional teams'] }
    ];

    vm.certifications = [
      { name: 'AWS Certified Cloud Practitioner', year: '2021' }
    ];

    vm.certificationBadge = 'images/aws-cloud-practitioner.png';

    vm.projects = [
      { title: 'Vector Scope AI LLC', subtitle: 'AI-Powered Geospatial Consultancy | 2025–Present', image: 'assets/images/CloudResumeArchitecture.png', alt: 'Vector Scope AI LLC', link: 'https://vectorscopeai.com', description: 'Lead AI-powered geospatial consultancy delivering spatial intelligence solutions for government and enterprise clients. Design cloud-native geospatial ETL pipelines, architect scalable spatial analytics for petabyte-scale geodata, and build automated workflows aligned with FedRAMP security and compliance.', stack: 'AWS, GeoAI, Python, Geospatial ETL, FedRAMP, Cloud-Native Architecture', siteUrl: 'https://vectorscopeai.com', siteLabel: 'vectorscopeai.com' },
      { title: 'Cloud Resume Challenge', subtitle: 'Open Source | 2022-2024', image: 'assets/images/CloudResumeArchitecture.png', alt: 'Cloud Resume Challenge', link: '/CloudResumeChallenge.html', description: 'Implemented a full-stack serverless architecture using AWS S3, CloudFront, Lambda, API Gateway, and DynamoDB. Configured Route 53 for domain management and AWS Certificate Manager for SSL/TLS security. Established CI/CD pipelines using GitHub Actions for automated testing and deployment. Designed and implemented IAM security policies following best practices.', stack: 'AWS S3, CloudFront, Lambda, API Gateway, DynamoDB, Route 53, AWS Certificate Manager, GitHub Actions, IAM', siteUrl: 'https://witcoskitech.com', siteLabel: 'witcoskitech.com' },
      { title: 'Global Ski Atlas', subtitle: 'Open Source | 2024-current', image: 'assets/images/globalskiatlas.jpg', alt: 'Global Ski Atlas', link: 'https://globalskiatlas.com', description: "Architected and deployed comprehensive AWS serverless infrastructure using Step Functions, Lambda, DynamoDB, S3, API Gateway, and SQS to automate ski resort data processing, integrated with Amazon Bedrock's Nova model for AI-generated resort descriptions. Designed RESTful API endpoints and orchestrated complex Step Functions workflows with 8+ Lambda functions to query OpenStreetMap, process data through SQS queues, and store enriched metadata in DynamoDB with S3 references. Developed automated deployment scripts and QGIS workflows to extract ski resort geometries from OpenStreetMap, creating high-resolution cartographic products and migrating to interactive D3.js web visualizations. Implemented serverless data pipelines connecting Google Sheets to S3 and DynamoDB, currently conducting spatial analysis using Python (Pandas + GeoPandas) for weather overlays and elevation metadata.", stack: 'AWS Step Functions, Lambda, DynamoDB, S3, API Gateway, SQS, Amazon Bedrock, QGIS, OpenStreetMap, D3.js, Python, Pandas, GeoPandas', siteUrl: 'https://globalskiatlas.com', siteLabel: 'globalskiatlas.com' },
      { title: 'Unity Game', subtitle: 'GIS SDK API', image: 'https://jwitcoski.github.io/UnityGames/tankgame/tank.gif', alt: 'Unity Game', link: 'https://jwitcoski.github.io/unity.html', description: 'Here is an example of my Unity game I created using a GIS SDK API. This game is available to be played on a Windows PC. Visit ', descriptionLink: 'https://jwitcoski.github.io/unity.html', descriptionLinkText: 'Unity Game', stack: 'Unity, C#, GIS SDK API', siteUrl: null, siteLabel: null }
    ];

    vm.contact = {
      email: 'jwitcoski@gmail.com',
      linkedin: 'https://www.linkedin.com/in/jonathanwitcoski'
    };

    vm.closeArticle = function () {
      $location.hash('');
    };

    vm.showSection = function (id) {
      $location.hash(id);
    };

    function syncSection() {
      var hash = $location.hash();
      vm.currentSection = (hash && hash.length) ? hash : null;
    }

    $scope.$watch(function () { return $location.hash(); }, function () {
      syncSection();
    });
    syncSection();

    angular.element($window).on('keyup', function (e) {
      if (e.keyCode === 27 && vm.currentSection) {
        $scope.$apply(function () { vm.closeArticle(); });
      }
    });

    $http.get('https://hmye7a6tg1.execute-api.us-east-1.amazonaws.com/beta')
      .then(function (res) {
        var data = JSON.parse(res.data.body);
        vm.visitorCount = data.Count;
      })
      .catch(function () {
        vm.visitorCount = 'Error loading visitor count';
      });
  }
})();
