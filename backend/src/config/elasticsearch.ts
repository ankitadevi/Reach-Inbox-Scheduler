import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';

dotenv.config();

const esNode = process.env.ELASTICSEARCH_NODE || 'http://localhost:9200';
export const ELASTICSEARCH_INDEX = process.env.ELASTICSEARCH_INDEX || 'emails';

export const esClient = new Client({
  node: esNode,
  maxRetries: 3,
  requestTimeout: 5000,
});

let isElasticAvailable = false;

export const checkElasticConnection = async (): Promise<boolean> => {
  try {
    const health = await esClient.cluster.health({});
    isElasticAvailable = true;
    console.log(`[Elasticsearch] Connected. Cluster status: ${health.status}`);
    await initializeIndex();
    return true;
  } catch (error: any) {
    isElasticAvailable = false;
    console.warn(`[Elasticsearch] Warning: Elasticsearch not available at ${esNode} (${error.message}). Full-text search will use DB fallback.`);
    return false;
  }
};

export const getElasticAvailability = () => isElasticAvailable;

const initializeIndex = async () => {
  try {
    const exists = await esClient.indices.exists({ index: ELASTICSEARCH_INDEX });
    if (!exists) {
      await esClient.indices.create({
        index: ELASTICSEARCH_INDEX,
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              userId: { type: 'keyword' },
              senderEmail: { type: 'keyword' },
              recipientEmail: { type: 'keyword' },
              subject: { type: 'text', analyzer: 'standard' },
              body: { type: 'text', analyzer: 'standard' },
              status: { type: 'keyword' },
              scheduledAt: { type: 'date' },
              sentAt: { type: 'date' },
              createdAt: { type: 'date' },
            },
          },
        },
      });
      console.log(`[Elasticsearch] Index '${ELASTICSEARCH_INDEX}' created successfully.`);
    }
  } catch (error: any) {
    console.error(`[Elasticsearch] Index initialization error:`, error.message);
  }
};
