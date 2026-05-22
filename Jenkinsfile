pipeline {
    agent any

    environment {
        IMAGE_NAME = "merazmz/expenser-app:latest"
    }

    stages {
        // STAGE 1: Pull the image compiled by GitHub Actions
        stage('Pull Image') {
            steps {
                echo 'Pulling fresh image from Docker Hub...'
                sh "docker pull ${IMAGE_NAME}"
            }
        }

        // STAGE 2: Scan for exposed environment secrets (Leaks)
        stage('Scan for Secrets Leaks') {
            steps {
                echo 'Checking for hardcoded database keys or secrets...'
                // Run TruffleHog scanner to scan files inside the image filesystem
                sh "docker run --rm -v /var/run/docker.sock:/var/run/docker.sock trufflesecurity/trufflehog:latest docker --image=${IMAGE_NAME} --only-verified"
            }
        }

        // STAGE 3: Scan for package vulnerabilities (CVEs)
        stage('Container Vulnerability Scan') {
            steps {
                echo 'Running Trivy container scanner...'
                // We add the '--ignore-unpatched' flag so we only fail on actionable items
                sh "docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -v trivy-cache:/root/.cache aquasec/trivy:latest image --severity HIGH,CRITICAL --ignore-unpatched --exit-code 1 ${IMAGE_NAME}"
            }
        }

        // STAGE 4: Final Validation
        stage('Approve Deployment') {
            steps {
                echo '=========================================='
                echo '  ✅ ALL VULNERABILITY SCANS PASSED!  '
                echo '  Image is verified as safe for production.'
                echo '=========================================='
            }
        }
    }

    post {
        always {
            // Clean up pulled files to save local hard drive space
            sh "docker image prune -f"
        }
        failure {
            echo '=========================================='
            echo '  ❌ SECURITY FAILURE DETECTED!'
            echo '  Check Gitleaks or Trivy console logs above.'
            echo '=========================================='
            // Send warning notifications or execute rollbacks here
        }
    }
}
