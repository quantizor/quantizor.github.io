'use strict';

module.exports = function(grunt) {

	// Project configuration.

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		connect: {
			server: {
				options: {
					hostname: '0.0.0.0',
					logger: 'dev',
					livereload: true,
					port: 9000
				}
			}
		},

		sass: {
			dist: {
				options: {
					style: 'compact'
				},
				files: {
					// 'destination': 'source'
					'css/style.css': 'scss/style.scss'
				}
			}
		},

		uglify: {
			options: {
				livereload: true,
				preserveComments: false
			},

			core: {
				files: [{
					expand: true,
					cwd: 'js/dev',
					src: '**/*.js',
					dest: 'js/src'
				}]
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
				files: ['scss/**/*.scss'],
				tasks: ['sass']
			},

			css: {
				files: ['css/style.css']
			},

			js: {
				files: ['js/dev/**/*.js'],
				tasks: ['uglify']
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
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-open');

	// Default task(s).
	grunt.registerTask('default', ['connect', 'sass', 'uglify', 'open', 'watch']);
};
