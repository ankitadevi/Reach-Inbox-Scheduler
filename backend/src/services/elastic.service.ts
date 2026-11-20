import { esClient, ELASTICSEARCH_INDEX, getElasticAvailability } from '../config/elasticsearch.js';
import { prisma } from '../config/db.js';

export interface IndexedEmailDoc {
  id: string;
  userId: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: string;
  sentAt?: string | null;
  createdAt: string;
}

export class ElasticService {
  public async indexEmail(email: {
    id: string;
    userId: string;
    senderEmail: string;
    recipientEmail: string;
    subject: string;
    body: string;
    status: string;
    scheduledAt: Date;
    sentAt?: Date | null;
    createdAt: Date;
  }) {
    if (!getElasticAvailability()) {
      return;
    }

    try {
      await esClient.index({
        index: ELASTICSEARCH_INDEX,
        id: email.id,
        document: {
          id: email.id,
          userId: email.userId,
          senderEmail: email.senderEmail,
          recipientEmail: email.recipientEmail,
          subject: email.subject,
          body: email.body,
          status: email.status,
          scheduledAt: email.scheduledAt.toISOString(),
          sentAt: email.sentAt ? email.sentAt.toISOString() : null,
          createdAt: email.createdAt.toISOString(),
        },
      });
      console.log(`[Elasticsearch] Indexed email ${email.id} into '${ELASTICSEARCH_INDEX}'`);
    } catch (error: any) {
      console.error(`[Elasticsearch] Failed to index email ${email.id}:`, error.message);
    }
  }

  public async updateEmailStatus(id: string, status: string, sentAt?: Date | null) {
    if (!getElasticAvailability()) {
      return;
    }

    try {
      await esClient.update({
        index: ELASTICSEARCH_INDEX,
        id,
        doc: {
          status,
          sentAt: sentAt ? sentAt.toISOString() : null,
        },
      });
      console.log(`[Elasticsearch] Updated status for email ${id} to ${status}`);
    } catch (error: any) {
      console.error(`[Elasticsearch] Failed to update email ${id}:`, error.message);
    }
  }

  public async searchEmails(userId: string, query: string, status?: string) {
    if (getElasticAvailability()) {
      try {
        const mustClauses: any[] = [{ term: { userId } }];

        if (status) {
          mustClauses.push({ term: { status } });
        }

        if (query && query.trim().length > 0) {
          mustClauses.push({
            multi_match: {
              query,
              fields: ['subject^3', 'body', 'recipientEmail^2', 'senderEmail'],
              fuzziness: 'AUTO',
            },
          });
        }

        const result = await esClient.search({
          index: ELASTICSEARCH_INDEX,
          query: {
            bool: {
              must: mustClauses,
            },
          },
          sort: [{ scheduledAt: { order: 'desc' } }],
          size: 100,
        });

        const hits = result.hits.hits;
        const emailIds = hits.map((h: any) => h._id);

        if (emailIds.length === 0) {
          return [];
        }

        // Hydrate from DB to ensure complete data (including etherealPreviewUrl and stars)
        const emails = await prisma.email.findMany({
          where: {
            id: { in: emailIds },
          },
        });

        // Retain ES sort order
        const idMap = new Map(emails.map((e) => [e.id, e]));
        return emailIds.map((id) => idMap.get(id)).filter(Boolean);
      } catch (error: any) {
        console.warn(`[Elasticsearch] Search query failed (${error.message}). Falling back to Prisma DB search.`);
      }
    }

    // Fallback search directly on Database
    const where: any = { userId };
    if (status) {
      where.status = status;
    }
    if (query && query.trim().length > 0) {
      where.OR = [
        { subject: { contains: query, mode: 'insensitive' } },
        { body: { contains: query, mode: 'insensitive' } },
        { recipientEmail: { contains: query, mode: 'insensitive' } },
        { senderEmail: { contains: query, mode: 'insensitive' } },
      ];
    }

    return prisma.email.findMany({
      where,
      orderBy: { scheduledAt: 'desc' },
      take: 100,
    });
  }
}

export const elasticService = new ElasticService();
