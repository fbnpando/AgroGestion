pipeline {
    agent any

    tools {
        // Asegurate de tener NodeJS configurado en Jenkins con este nombre
        nodejs 'NodeJS-18'
    }

    environment {
        JMETER_HOME = 'C:\\apache-jmeter'   // Ajustá la ruta según tu instalación de JMeter
        APP_URL     = 'http://localhost:5173' // URL de la app (dev server o staging)
    }

    stages {

        stage('Checkout') {
            steps {
                echo '📥 Clonando repositorio...'
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                echo '📦 Instalando dependencias...'
                bat 'npm ci'
            }
        }

        stage('Lint') {
            steps {
                echo '🔍 Ejecutando ESLint...'
                bat 'npm run lint'
            }
        }

        stage('Build') {
            steps {
                echo '🏗️ Construyendo la aplicación...'
                bat 'npm run build'
            }
            post {
                success {
                    echo '✅ Build exitoso.'
                    archiveArtifacts artifacts: 'dist/**/*', fingerprint: true
                }
            }
        }

        stage('Start Preview Server') {
            steps {
                echo '🚀 Levantando servidor de preview para pruebas...'
                // Levanta el preview del build en background
                bat 'start /B npm run preview -- --port 5173'
                // Espera a que el servidor esté disponible
                bat 'timeout /t 5 /nobreak'
            }
        }

        stage('Performance Tests - JMeter') {
            steps {
                echo '⚡ Ejecutando pruebas de performance con JMeter...'
                bat """
                    %JMETER_HOME%\\bin\\jmeter.bat ^
                        -n ^
                        -t jmeter\\agrogestion-test-plan.jmx ^
                        -l jmeter\\results\\results.jtl ^
                        -e -o jmeter\\results\\report ^
                        -Japp.url=%APP_URL%
                """
            }
            post {
                always {
                    // Publica el reporte de JMeter en Jenkins (requiere plugin Performance)
                    perfReport sourceDataFiles: 'jmeter/results/results.jtl'
                    publishHTML(target: [
                        reportDir:   'jmeter/results/report',
                        reportFiles: 'index.html',
                        reportName:  'JMeter Performance Report'
                    ])
                }
            }
        }

    }

    post {
        success {
            echo '🎉 Pipeline completado exitosamente.'
        }
        failure {
            echo '❌ Pipeline fallido. Revisar logs.'
        }
        always {
            // Limpia el servidor de preview
            bat 'taskkill /F /IM node.exe /T 2>nul || exit 0'
        }
    }
}
