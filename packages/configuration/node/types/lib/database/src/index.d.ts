import postgres from 'postgres';
export type PostgresConnection = postgres.Sql<Record<string, postgres.PostgresType>>;
declare const sql: PostgresConnection;
export declare function getTestSql(options?: {
    debug?: postgres.Options<Record<string, postgres.PostgresType>>["debug"];
}): Promise<{
    username: string;
    password: string;
    database: string;
    sql: PostgresConnection;
    destroySql: () => Promise<void>;
}>;
export default sql;
