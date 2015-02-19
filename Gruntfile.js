'use strict';

module.exports = function(grunt) {
    require('time-grunt')(grunt);

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
            dev: {
                options: {
                    style: 'compact'
                },
                files: {
                    // 'destination': 'source'
                    'dist/css/style.css': 'src/scss/style.scss'
                }
            },
            dist: {
                options: {
                    style: 'compressed'
                },
                files: {
                    // 'destination': 'source'
                    'dist/css/style.css': 'src/scss/style.scss'
                }
            }
        },

        postcss: {
            options: {
                map: true,
                processors: [
                    require('autoprefixer-core')({
                        browsers: 'last 3 versions'
                    }).postcss
                ]
            },
            dist: {
                src: 'dist/css/style.css'
            }
        },

        jshint: {
            dist: ['src/js/**/*.js']
        },

        uglify: {
            options: {
                livereload: true,
                preserveComments: 'some'
            },

            core: {
                files: [{
                    expand: true,
                    cwd: 'src/js',
                    src: '**/*.js',
                    dest: 'dist/js'
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
                files: ['src/scss/style.scss'],
                tasks: ['sass']
            },

            css: {
                files: ['dist/css/style.css'],
                tasks: ['postcss']
            },

            js: {
                files: ['src/js/**/*.js'],
                tasks: ['jshint', 'uglify']
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
    grunt.loadNpmTasks('grunt-postcss');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-open');

    // Default task(s).
    grunt.registerTask('default', [
        'jshint',
        'uglify',
        'sass:dist',
        'postcss'
    ]);

    grunt.registerTask('dev', [
        'connect',
        'sass:dev',
        'postcss',
        'uglify',
        'open',
        'watch'
    ]);
};
