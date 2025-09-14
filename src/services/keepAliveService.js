/**
 * Keep Alive Service
 * Prevents Render free tier from spinning down by making periodic health checks
 */

const axios = require('axios');
const cron = require('node-cron');
const logger = require('../utils/logger');

class KeepAliveService {
    constructor() {
        this.appUrl = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL;
        this.isEnabled = process.env.NODE_ENV === 'production' && this.appUrl;
        this.pingInterval = '*/14 * * * *'; // Every 14 minutes
        this.cronJob = null;
    }

    /**
     * Initialize the keep-alive service
     */
    init() {
        if (!this.isEnabled) {
            logger.info('Keep-alive service disabled (not in production or no APP_URL set)');
            return;
        }

        logger.info(`Initializing keep-alive service for ${this.appUrl}`);
        this.startPingSchedule();
    }

    /**
     * Start the automated ping schedule
     */
    startPingSchedule() {
        try {
            // Schedule the ping every 14 minutes
            this.cronJob = cron.schedule(this.pingInterval, async () => {
                await this.performHealthPing();
            }, {
                scheduled: true,
                timezone: "UTC"
            });

            logger.info('Keep-alive ping scheduled every 14 minutes');
        } catch (error) {
            logger.error('Failed to start keep-alive schedule:', error);
        }
    }

    /**
     * Perform a health ping to keep the service alive
     */
    async performHealthPing() {
        try {
            const startTime = Date.now();
            const healthUrl = `${this.appUrl}/health`;
            
            logger.info(`Performing keep-alive ping to ${healthUrl}`);
            
            const response = await axios.get(healthUrl, {
                timeout: 30000, // 30 seconds timeout
                headers: {
                    'User-Agent': 'KeepAlive-Service/1.0',
                    'X-Keep-Alive': 'true'
                }
            });

            const responseTime = Date.now() - startTime;
            
            if (response.status === 200) {
                logger.info(`Keep-alive ping successful - Response time: ${responseTime}ms`);
            } else {
                logger.warn(`Keep-alive ping returned status ${response.status}`);
            }

        } catch (error) {
            logger.error('Keep-alive ping failed:', {
                message: error.message,
                code: error.code,
                status: error.response?.status
            });
        }
    }

    /**
     * Stop the keep-alive service
     */
    stop() {
        if (this.cronJob) {
            this.cronJob.stop();
            logger.info('Keep-alive service stopped');
        }
    }

    /**
     * Get service status
     */
    getStatus() {
        return {
            enabled: this.isEnabled,
            appUrl: this.appUrl,
            pingInterval: this.pingInterval,
            isRunning: this.cronJob ? this.cronJob.running : false
        };
    }

    /**
     * Manual ping for testing
     */
    async manualPing() {
        if (!this.appUrl) {
            throw new Error('APP_URL not configured');
        }
        
        logger.info('Performing manual keep-alive ping');
        await this.performHealthPing();
    }
}

module.exports = new KeepAliveService();