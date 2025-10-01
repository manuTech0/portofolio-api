import { GraphQLError, Kind, type ValueNode } from "graphql";
import { builder } from "../../lib/builderSchema";



export const DateTime = builder.scalarType("DateTime", {
    serialize: (v) => v.toISOString(),
    parseValue: (v) => new Date(v as string),
    parseLiteral: (ast: ValueNode) => {
        if(ast.kind === Kind.STRING || ast.kind == Kind.INT) {
            return new Date(ast.value)
        }
        throw new GraphQLError("Date literal must be a string or int")
    } 
})