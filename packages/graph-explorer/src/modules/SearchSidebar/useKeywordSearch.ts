import { useCallback, useMemo } from "react";
import {
  displayVertexTypeConfigSelector,
  displayVertexTypeConfigsSelector,
  useDisplayVertexTypeConfigs,
} from "@/core";
import useDebounceValue from "@/hooks/useDebounceValue";
import { useKeywordSearchQuery } from "../SearchSidebar/useKeywordSearchQuery";

import { atom, selector, useRecoilState, useRecoilValue } from "recoil";
import { queryEngineSelector, useQueryEngine } from "@/core/connector";

export interface PromiseWithCancel<T> extends Promise<T> {
  cancel?: () => void;
}

const allVerticesValue = "__all";
const allAttributesValue = "__all";
const idAttributeValue = "__id";

export const searchTermAtom = atom({ key: "searchTerm", default: "" });
export const selectedVertexTypeAtom = atom({
  key: "selectedVertexType",
  default: allVerticesValue,
});
export const selectedAttributeAtom = atom({
  key: "selectedAttribute",
  default: idAttributeValue,
});
export const partialMatchAtom = atom({ key: "partialMatch", default: false });

/** Gets all searchable attributes across all vertex types */
const combinedSearchableAttributesSelector = selector({
  key: "combinedSearchableAttributes",
  get: ({ get }) => {
    const allVertexTypeConfigs = get(displayVertexTypeConfigsSelector);

    // Get unique searchable attributes across all vertex types
    const uniqueSearchableAttributes = new Map(
      allVertexTypeConfigs
        .values()
        .flatMap(c => c.attributes)
        .filter(a => a.isSearchable)
        .map(a => [a.name, a])
    )
      .values()
      .toArray();

    // Sort by name
    return uniqueSearchableAttributes.sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  },
});

const attributeOptionsSelector = selector({
  key: "attributeOptions",
  get: ({ get }) => {
    const selectedVertexType = get(selectedVertexTypeAtom);

    // Sparql uses rdfs:label, not ID
    const allowsIdSearch = get(queryEngineSelector) !== "sparql";

    // Get searchable attributes for selected vertex type
    const searchableAttributes =
      selectedVertexType === allVerticesValue
        ? get(combinedSearchableAttributesSelector)
        : get(displayVertexTypeConfigSelector(selectedVertexType)).attributes;

    const attributeOptions = (() => {
      const defaultAttributes = allowsIdSearch
        ? [
            { label: "All", value: allAttributesValue },
            { label: "ID", value: idAttributeValue },
          ]
        : [{ label: "All", value: allAttributesValue }];

      const attributes = searchableAttributes.map(attr => ({
        value: attr.name,
        label: attr.displayLabel,
      }));

      return [...defaultAttributes, ...attributes];
    })();

    return attributeOptions;
  },
});

/** Manages all the state and gathers all required information to render the
 * keyword search sidebar. */
export default function useKeywordSearch() {
  const queryEngine = useQueryEngine();

  const [searchTerm, setSearchTerm] = useRecoilState(searchTermAtom);
  const debouncedSearchTerm = useDebounceValue(searchTerm, 600);
  const [selectedVertexType, setSelectedVertexType] = useRecoilState(
    selectedVertexTypeAtom
  );
  const [selectedAttribute, setSelectedAttribute] = useRecoilState(
    selectedAttributeAtom
  );
  const [partialMatch, setPartialMatch] = useRecoilState(partialMatchAtom);

  const exactMatchOptions = [
    { label: "Exact", value: "Exact" },
    { label: "Partial", value: "Partial" },
  ];

  const vtConfigs = useDisplayVertexTypeConfigs();
  const vertexOptions = useMemo(
    () => [
      { label: "All", value: allVerticesValue },
      ...vtConfigs.values().map(vtConfig => ({
        label: vtConfig.displayLabel,
        value: vtConfig.type,
      })),
    ],
    [vtConfigs]
  );

  const attributesOptions = useRecoilValue(attributeOptionsSelector);
  const defaultSearchAttribute = useMemo(() => {
    if (queryEngine === "sparql") {
      const rdfsLabel = attributesOptions.find(o => o.label === "rdfs:label");
      return rdfsLabel?.value ?? allAttributesValue;
    } else {
      return idAttributeValue;
    }
  }, [queryEngine, attributesOptions]);

  /** This is the selected attribute unless the attribute is not in the
   * attribute options list (for example, the selected vertex type changed). */
  const safeSelectedAttribute =
    attributesOptions.find(opt => opt.value === selectedAttribute)?.value ??
    defaultSearchAttribute;

  const onSearchTermChange = useCallback(
    (value: string) => {
      setSearchTerm(value);
    },
    [setSearchTerm]
  );

  const onVertexOptionChange = useCallback(
    (value: string) => {
      setSelectedVertexType(value);
    },
    [setSelectedVertexType]
  );

  const onAttributeOptionChange = useCallback(
    (value: string) => {
      setSelectedAttribute(value);
    },
    [setSelectedAttribute]
  );

  const onPartialMatchChange = useCallback(
    (value: boolean) => {
      setPartialMatch(value);
    },
    [setPartialMatch]
  );

  const searchPlaceholder = useMemo(() => {
    const attributes =
      safeSelectedAttribute === allAttributesValue
        ? attributesOptions
            .filter(attr => attr.value !== allAttributesValue)
            .map(attr => attr.label)
            .join(", ")
        : (attributesOptions.find(opt => opt.value === safeSelectedAttribute)
            ?.label ?? safeSelectedAttribute);

    return `Search by ${attributes}`;
  }, [attributesOptions, safeSelectedAttribute]);

  const vertexTypes =
    selectedVertexType === allVerticesValue ? [] : [selectedVertexType];
  const searchByAttributes =
    safeSelectedAttribute === allAttributesValue
      ? attributesOptions
          .filter(attr => attr.value !== allAttributesValue)
          .map(attr => attr.value)
      : [safeSelectedAttribute];

  const query = useKeywordSearchQuery({
    debouncedSearchTerm,
    vertexTypes,
    searchByAttributes,
    exactMatch: !partialMatch,
  });

  return {
    query,
    debouncedSearchTerm,
    onSearchTermChange,
    onVertexOptionChange,
    searchPlaceholder,
    searchTerm,
    selectedVertexType,
    vertexOptions,
    selectedAttribute: safeSelectedAttribute,
    attributesOptions,
    onAttributeOptionChange,
    partialMatch,
    exactMatchOptions,
    onPartialMatchChange,
  };
}
