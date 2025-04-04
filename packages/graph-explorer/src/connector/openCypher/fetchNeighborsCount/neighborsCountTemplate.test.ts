import { normalize } from "@/utils/testing";
import neighborsCountTemplate from "./neighborsCountTemplate";
import { createVertexId } from "@/core";

describe("OpenCypher > neighborsCountTemplate", () => {
  it("Should return a template for the given vertex id", () => {
    const template = neighborsCountTemplate({
      vertexId: createVertexId("12"),
    });

    expect(normalize(template)).toBe(
      normalize(
        `
          MATCH (v)-[]-(neighbor) 
          WHERE ID(v) = "12" 
          WITH DISTINCT neighbor 
          RETURN labels(neighbor) AS vertexLabel, count(DISTINCT neighbor) AS count
        `
      )
    );
  });

  it("Should return a template for the given vertex id with defined limit", () => {
    const template = neighborsCountTemplate({
      vertexId: createVertexId("12"),
      limit: 20,
    });

    expect(normalize(template)).toBe(
      normalize(
        `
        MATCH (v)-[]-(neighbor) 
        WHERE ID(v) = "12"
        WITH DISTINCT neighbor 
        LIMIT 20
        RETURN labels(neighbor) AS vertexLabel, count(DISTINCT neighbor) AS count 
        `
      )
    );
  });

  it("Should return a template for the given vertex id with no limit", () => {
    const template = neighborsCountTemplate({
      vertexId: createVertexId("12"),
      limit: 0,
    });

    expect(normalize(template)).toBe(
      normalize(
        `
        MATCH (v)-[]-(neighbor)
        WHERE ID(v) = "12"
        WITH DISTINCT neighbor 
        RETURN labels(neighbor) AS vertexLabel, count(DISTINCT neighbor) AS count
        `
      )
    );
  });
});
