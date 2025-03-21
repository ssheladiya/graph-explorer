import keywordSearchTemplate from "./keywordSearchTemplate";
import { normalizeWithNoSpace as normalize } from "@/utils/testing";

describe("Gremlin > keywordSearchTemplate", () => {
  it("Should return a template for an empty request", () => {
    const template = keywordSearchTemplate({});

    expect(normalize(template)).toBe(normalize("g.V()"));
  });

  it("Should return a template only for vertex type", () => {
    const template = keywordSearchTemplate({
      vertexTypes: ["airport"],
    });

    expect(normalize(template)).toBe(normalize('g.V().hasLabel("airport")'));
  });

  it("Should return a template for searched attributes containing the search term", () => {
    const template = keywordSearchTemplate({
      searchTerm: "JFK",
      searchByAttributes: ["city", "code"],
    });

    expect(normalize(template)).toBe(
      normalize(
        'g.V().or(has("city",containing("JFK")),has("code",containing("JFK")))'
      )
    );
  });

  it("Should return a template for searched attributes exactly matching the search term", () => {
    const template = keywordSearchTemplate({
      searchTerm: "JFK",
      searchByAttributes: ["city", "code"],
      exactMatch: true,
    });

    expect(normalize(template)).toBe(
      normalize('g.V().or(has("city","JFK"),has("code","JFK"))')
    );
  });

  it("Should escape the search term", () => {
    const template = keywordSearchTemplate({
      searchTerm: '"JFK"',
      searchByAttributes: ["code"],
      exactMatch: true,
    });

    expect(normalize(template)).toBe(
      normalize('g.V().or(has("code","\\"JFK\\""))')
    );
  });

  it("Should return a template for the ID token attribute exactly matching the search term", () => {
    const template = keywordSearchTemplate({
      vertexTypes: ["airport"],
      searchTerm: "JFK",
      exactMatch: true,
      searchByAttributes: ["__id"],
    });

    expect(normalize(template)).toBe(
      normalize('g.V().hasLabel("airport").or(has(id,"JFK"))')
    );
  });

  it("Should return a template for the ID token attribute partially matching the search term", () => {
    const template = keywordSearchTemplate({
      vertexTypes: ["airport"],
      searchTerm: "JFK",
      exactMatch: false,
      searchByAttributes: ["__id"],
    });

    expect(normalize(template)).toBe(
      normalize('g.V().hasLabel("airport").or(has(id,containing("JFK")))')
    );
  });

  it("Should return a template for searched attributes matching with the search terms, and the ID token attribute", () => {
    const template = keywordSearchTemplate({
      searchTerm: "JFK",
      searchByAttributes: ["city", "code", "__all"],
    });

    expect(normalize(template)).toBe(
      normalize(`
        g.V()
          .or(
            has(id, containing("JFK")), 
            has("city", containing("JFK")), 
            has("code", containing("JFK"))
          )
      `)
    );
  });

  it("Should return a template for a single vertex and paged", () => {
    const template = keywordSearchTemplate({
      vertexTypes: ["airport"],
      offset: 25,
      limit: 25,
    });

    expect(normalize(template)).toBe(
      normalize('g.V().hasLabel("airport").range(25,50)')
    );
  });

  it("Should return a template with an offset and limit", () => {
    const template = keywordSearchTemplate({
      searchTerm: "JFK",
      searchByAttributes: ["code"],
      offset: 2,
      limit: 10,
    });

    expect(normalize(template)).toBe(
      normalize('g.V().or(has("code",containing("JFK"))).range(2,12)')
    );
  });

  it("Should return a template with just a limit", () => {
    const template = keywordSearchTemplate({
      searchTerm: "JFK",
      searchByAttributes: ["code"],
      limit: 10,
    });

    expect(normalize(template)).toBe(
      normalize('g.V().or(has("code",containing("JFK"))).range(0,10)')
    );
  });

  it("Should return a template without a range when limit is zero", () => {
    const template = keywordSearchTemplate({
      searchTerm: "JFK",
      searchByAttributes: ["code"],
      limit: 0,
    });

    expect(normalize(template)).toBe(
      normalize('g.V().or(has("code",containing("JFK")))')
    );
  });

  it("Should return a template for a specific vertex type", () => {
    const template = keywordSearchTemplate({
      searchTerm: "JFK",
      vertexTypes: ["airport"],
      searchByAttributes: ["code"],
      limit: 25,
      offset: 1,
    });

    expect(normalize(template)).toBe(
      normalize(
        'g.V().hasLabel("airport").or(has("code",containing("JFK"))).range(1,26)'
      )
    );
  });
});
