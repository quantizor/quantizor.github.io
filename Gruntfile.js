'use strict';

module.exports = function(grunt) {

  // Project configuration.

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    connect: {
      server: {
        options: {
          hostname: 'localhost',
          logger: 'dev',
          livereload: true,
          port: 9000
        }
      }
    },
    sass: {
      dist: {
        options: {
          style: 'expanded'
        },
        files: {
          // 'destination': 'source'
          'css/style.css': 'sass/style.sass'
        }
      }
    },
    watch: {
      options: {
        livereload: true
      },
      html: {
        files: ['**/*.html']
      },
      sass: {
        options: {
          livereload: false
        },
        files: ['sass/**/*.sass', 'sass/**/*.scss'],
        tasks: ['sass']
      },
      css: {
        files: ['css/style.css']
      },
      js: {
        files: ['js/**/*.js']
      },
      json: {
        files: ['json/**/*.json']
      }
    },
    open: {
      server: {
        path: 'http://localhost:9000/',
        app: 'Google Chrome'
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-sass');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-open');

  // Default task(s).
  grunt.registerTask('default', ['connect', 'sass', 'open', 'watch']);

};