import groupBy from "lodash/groupBy";
import { Edge, Vertex, VertexId } from "@/core";
import {
  toMappedQueryResults,
  type NeighborsResponse,
} from "@/connector/useGEFetchTypes";
import mapIncomingToEdge, {
  IncomingPredicate,
  isIncomingPredicate,
} from "../mappers/mapIncomingToEdge";
import mapOutgoingToEdge, {
  OutgoingPredicate,
} from "../mappers/mapOutgoingToEdge";
import mapRawResultToVertex from "../mappers/mapRawResultToVertex";
import oneHopNeighborsTemplate from "./oneHopNeighborsTemplate";
import subjectPredicatesTemplate from "./subjectPredicatesTemplate";
import {
  RawResult,
  RawValue,
  SparqlFetch,
  SPARQLNeighborsRequest,
} from "../types";
import { logger } from "@/utils";

type RawOneHopNeighborsResponse = {
  results: {
    bindings: Array<{
      subject: RawValue;
      pred: RawValue;
      value: RawValue;
      subjectClass: RawValue;
      pToSubject?: RawValue;
      pFromSubject?: RawValue;
    }>;
  };
};

type RawNeighborsPredicatesResponse = {
  results: {
    bindings: Array<OutgoingPredicate | IncomingPredicate>;
  };
};

const isBlank = (result: RawValue) => {
  return result.type === "bnode";
};

const fetchOneHopNeighbors = async (
  sparqlFetch: SparqlFetch,
  req: SPARQLNeighborsRequest
) => {
  const oneHopTemplate = oneHopNeighborsTemplate(req);
  logger.log("[SPARQL Explorer] Fetching oneHopNeighbors...", req);
  const data = await sparqlFetch<RawOneHopNeighborsResponse>(oneHopTemplate);

  const groupBySubject = groupBy(
    data.results.bindings,
    result => result.subject.value
  );

  const mappedResults: Record<string, RawResult> = {};
  const bNodesEdges: Edge[] = [];

  Object.entries(groupBySubject).forEach(([uri, result]) => {
    // Create outgoing predicates to blank nodes
    if (isBlank(result[0].subject) && result[0].pToSubject) {
      const edge = mapOutgoingToEdge(req.resourceURI, req.resourceClasses, {
        subject: result[0].subject,
        subjectClass: result[0].subjectClass,
        predToSubject: result[0].pToSubject,
      });
      bNodesEdges.push(edge);
    }

    // Create incoming predicates from blank nodes
    if (isBlank(result[0].subject) && result[0].pFromSubject) {
      const edge = mapIncomingToEdge(req.resourceURI, req.resourceClasses, {
        subject: result[0].subject,
        subjectClass: result[0].subjectClass,
        predFromSubject: result[0].pFromSubject,
      });
      bNodesEdges.push(edge);
    }

    mappedResults[uri] = {
      uri: uri,
      class: result[0].subjectClass.value,
      isBlank: isBlank(result[0].subject),
      attributes: {},
    };

    result.forEach(attr => {
      mappedResults[uri].attributes[attr.pred.value] = attr.value.value;
    });
  });

  const vertices = Object.values(mappedResults).map(result => {
    return mapRawResultToVertex(result);
  });

  return {
    vertices,
    bNodesEdges,
  };
};

export const fetchNeighborsPredicates = async (
  sparqlFetch: SparqlFetch,
  resourceURI: VertexId,
  resourceClasses: Vertex["types"],
  subjectURIs: VertexId[]
) => {
  const template = subjectPredicatesTemplate({
    resourceURI,
    subjectURIs,
  });

  logger.log("[SPARQL Explorer] Fetching neighbor predicates...", {
    resourceURI,
    resourceClasses,
    subjectURIs,
  });
  const response = await sparqlFetch<RawNeighborsPredicatesResponse>(template);
  return response.results.bindings.map(result => {
    if (isIncomingPredicate(result)) {
      return mapIncomingToEdge(resourceURI, resourceClasses, result);
    }

    return mapOutgoingToEdge(resourceURI, resourceClasses, result);
  });
};

/**
 * Given a subject URI, it returns a set of subjects (with their properties)
 * which are directly connected.
 * We differentiate two types of neighbors:
 * - outgoing neighbors, which are neighbors that are reached using
 *   the given subject as starting point (<subject_uri> ?pred ?outgoingSubject)
 * - incoming neighbors, which are neighbors can reach the given
 *   subject (?incomingSubject ?pred <subject_uri>)
 *
 * It also, perform a query for each neighbors to know
 * how many subjects are connected to it.
 *
 * It does not return neighbors counts.
 */
const fetchNeighbors = async (
  sparqlFetch: SparqlFetch,
  req: SPARQLNeighborsRequest
): Promise<NeighborsResponse> => {
  const { vertices, bNodesEdges } = await fetchOneHopNeighbors(
    sparqlFetch,
    req
  );
  const subjectsURIs = vertices.map(v => v.id);
  const edges = await fetchNeighborsPredicates(
    sparqlFetch,
    req.resourceURI,
    req.resourceClasses,
    subjectsURIs
  );

  return toMappedQueryResults({
    vertices,
    edges: [...edges, ...bNodesEdges],
  });
};

export default fetchNeighbors;
