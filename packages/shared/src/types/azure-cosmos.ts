import { MongoClient, Db, Collection, Document, Filter, UpdateFilter, FindOptions, AggregateOptions } from 'mongodb';

export interface AzureCosmosConfig {
    connectionString: string;
    databaseName: string;
    testDatabaseName?: string;
}

export interface CosmosDocument extends Document {
    _id?: string;
    userId?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface CreateDocumentParams {
    collection: string;
    document: any;
    userId?: string;
}

export interface GetDocumentParams {
    collection: string;
    id: string;
    userId?: string;
}

export interface UpdateDocumentParams {
    collection: string;
    id: string;
    updates: any;
    userId?: string;
}

export interface DeleteDocumentParams {
    collection: string;
    id: string;
    userId?: string;
}

export interface QueryDocumentsParams {
    collection: string;
    filter?: Filter<Document>;
    options?: FindOptions;
    userId?: string;
}

export interface AggregateDataParams {
    collection: string;
    pipeline: Document[];
    options?: AggregateOptions;
    userId?: string;
}

export interface UserScopedQueryParams {
    userId: string;
    collection: string;
    filter?: Filter<Document>;
    options?: FindOptions;
}

export interface UserScopedCreateParams {
    userId: string;
    collection: string;
    document: any;
}

export interface CosmosServiceResult<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    insertedId?: string;
    modifiedCount?: number;
    deletedCount?: number;
}

export interface QueryOptions extends FindOptions {
    limit?: number;
    skip?: number;
    sort?: any;
    projection?: any;
}