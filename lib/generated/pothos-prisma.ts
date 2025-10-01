/* eslint-disable */
import type { Prisma, Users, Posts, Session, Todos } from "./prisma/index.js";
export default interface PrismaTypes {
    Users: {
        Name: "Users";
        Shape: Users;
        Include: Prisma.UsersInclude;
        Select: Prisma.UsersSelect;
        OrderBy: Prisma.UsersOrderByWithRelationInput;
        WhereUnique: Prisma.UsersWhereUniqueInput;
        Where: Prisma.UsersWhereInput;
        Create: {};
        Update: {};
        RelationName: "posts" | "session" | "todos";
        ListRelations: "posts" | "session";
        Relations: {
            posts: {
                Shape: Posts[];
                Name: "Posts";
                Nullable: false;
            };
            session: {
                Shape: Session[];
                Name: "Session";
                Nullable: false;
            };
            todos: {
                Shape: Todos | null;
                Name: "Todos";
                Nullable: true;
            };
        };
    };
    Posts: {
        Name: "Posts";
        Shape: Posts;
        Include: Prisma.PostsInclude;
        Select: Prisma.PostsSelect;
        OrderBy: Prisma.PostsOrderByWithRelationInput;
        WhereUnique: Prisma.PostsWhereUniqueInput;
        Where: Prisma.PostsWhereInput;
        Create: {};
        Update: {};
        RelationName: "user";
        ListRelations: never;
        Relations: {
            user: {
                Shape: Users;
                Name: "Users";
                Nullable: false;
            };
        };
    };
    Session: {
        Name: "Session";
        Shape: Session;
        Include: Prisma.SessionInclude;
        Select: Prisma.SessionSelect;
        OrderBy: Prisma.SessionOrderByWithRelationInput;
        WhereUnique: Prisma.SessionWhereUniqueInput;
        Where: Prisma.SessionWhereInput;
        Create: {};
        Update: {};
        RelationName: "user";
        ListRelations: never;
        Relations: {
            user: {
                Shape: Users;
                Name: "Users";
                Nullable: false;
            };
        };
    };
    Todos: {
        Name: "Todos";
        Shape: Todos;
        Include: Prisma.TodosInclude;
        Select: Prisma.TodosSelect;
        OrderBy: Prisma.TodosOrderByWithRelationInput;
        WhereUnique: Prisma.TodosWhereUniqueInput;
        Where: Prisma.TodosWhereInput;
        Create: {};
        Update: {};
        RelationName: "user";
        ListRelations: never;
        Relations: {
            user: {
                Shape: Users;
                Name: "Users";
                Nullable: false;
            };
        };
    };
}