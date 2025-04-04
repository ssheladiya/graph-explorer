import { idParam } from "../idParam";
import { SPARQLNeighborsRequest } from "../types";
import { getFilters, getLimit, getSubjectClasses } from "./helpers";
import { query } from "@/utils";

/**
 * Fetch all neighbors and their predicates, values, and classes.
 *
 * @example
 * resourceURI = "http://www.example.com/soccer/resource#EPL"
 * subjectClasses = [
 *   "http://www.example.com/soccer/ontology/Team",
 * ]
 * filterCriteria = [
 *   { predicate: "http://www.example.com/soccer/ontology/teamName", object: "Arsenal" },
 *   { predicate: "http://www.example.com/soccer/ontology/nickname", object: "Gunners" },
 * ]
 * limit = 2
 * offset = 0
 *
 * SELECT ?subject ?pred ?value ?subjectClass ?pToSubject ?pFromSubject {
 *   ?subject a     ?subjectClass;
 *            ?pred ?value {
 *     SELECT DISTINCT ?subject ?pToSubject ?pFromSubject {
 *       BIND(<http://www.example.com/soccer/resource#EPL> AS ?argument)
 *       VALUES ?subjectClass {
 *         <http://www.example.com/soccer/ontology/Team>
 *       }
 *       {
 *         ?argument ?pToSubject ?subject.
 *         ?subject a            ?subjectClass;
 *                  ?sPred       ?sValue .
 *         FILTER (
 *           (?sPred=<http://www.example.com/soccer/ontology/teamName> && regex(str(?sValue), "Arsenal", "i")) ||
 *           (?sPred=<http://www.example.com/soccer/ontology/nickname> && regex(str(?sValue), "Gunners", "i"))
 *         )
 *       }
 *       UNION
 *       {
 *         ?subject ?pFromSubject ?argument;
 *                  a             ?subjectClass;
 *                  ?sPred        ?sValue .
 *        FILTER (
 *           (?sPred=<http://www.example.com/soccer/ontology/teamName> && regex(str(?sValue), "Arsenal", "i")) ||
 *           (?sPred=<http://www.example.com/soccer/ontology/nickname> && regex(str(?sValue), "Gunners", "i"))
 *         )
 *       }
 *     }
 *     LIMIT 2
 *     OFFSET 0
 *   }
 *   FILTER(isLiteral(?value))
 * }
 */
export default function oneHopNeighborsTemplate({
  resourceURI,
  subjectClasses = [],
  filterCriteria = [],
  limit = 0,
  offset = 0,
}: SPARQLNeighborsRequest): string {
  return query`
    # Fetch all neighbors and their predicates, values, and classes
    SELECT ?subject ?pred ?value ?subjectClass ?pToSubject ?pFromSubject {
      ?subject a     ?subjectClass;
               ?pred ?value {
        SELECT DISTINCT ?subject ?pToSubject ?pFromSubject {
          BIND(${idParam(resourceURI)} AS ?argument)
          ${getSubjectClasses(subjectClasses)}
          {
            ?argument ?pToSubject ?subject.
            ?subject a         ?subjectClass;
                     ?sPred    ?sValue .
            ${getFilters(filterCriteria)}
          }
          UNION
          {
            ?subject ?pFromSubject ?argument;
                     a         ?subjectClass;
                     ?sPred    ?sValue .
           ${getFilters(filterCriteria)}
          }
        }
        ${getLimit(limit, offset)}
      }
      FILTER(isLiteral(?value))
    }
  `;
}
