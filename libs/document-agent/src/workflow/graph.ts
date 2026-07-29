import { END, START, StateGraph } from '@langchain/langgraph';
import {
  critiqueRulesNode,
  draftHtmlNode,
  loadRulesNode,
  planDocumentNode,
  publishNode,
  rejectNode,
  repairHtmlNode,
  routeAfterCritique,
  routeAfterValidation,
  validateHtmlNode,
} from './nodes';
import { DocumentAgentState } from './state';

export function createDocumentAgentGraph() {
  const workflow = new StateGraph(DocumentAgentState)
    .addNode('load_rules', loadRulesNode)
    .addNode('plan_document', planDocumentNode)
    .addNode('draft_html', draftHtmlNode)
    .addNode('validate_html', validateHtmlNode)
    .addNode('critique_rules', critiqueRulesNode)
    .addNode('repair_html', repairHtmlNode)
    .addNode('publish', publishNode)
    .addNode('reject', rejectNode)
    .addEdge(START, 'load_rules')
    .addEdge('load_rules', 'plan_document')
    .addEdge('plan_document', 'draft_html')
    .addEdge('draft_html', 'validate_html')
    .addConditionalEdges('validate_html', routeAfterValidation, {
      critique: 'critique_rules',
      repair: 'repair_html',
      reject: 'reject',
    })
    .addConditionalEdges('critique_rules', routeAfterCritique, {
      publish: 'publish',
      repair: 'repair_html',
      reject: 'reject',
    })
    .addEdge('repair_html', 'validate_html')
    .addEdge('publish', END)
    .addEdge('reject', END);

  return workflow.compile();
}

export const documentAgentGraph = createDocumentAgentGraph();
