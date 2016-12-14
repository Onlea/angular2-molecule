import {
  Component, AfterViewInit, ViewChild, ElementRef, OnChanges, Input,
  SimpleChanges
} from '@angular/core';
import {
  scaleSqrt, select, forceLink, forceManyBody, forceSimulation, forceCenter
} from 'd3';
import { Utils } from '../utils';

@Component({
  selector: 'molecule',
  templateUrl: './molecule.component.html',
  styleUrls: ['./molecule.component.css']
})
export class MoleculeComponent implements AfterViewInit, OnChanges {

  @Input() links: Array<any>;
  @Input() nodes: Array<any>;
  @ViewChild('container') svgElRef: ElementRef;
  @ViewChild('links') linksElRef: ElementRef;
  @ViewChild('nodes') nodesElRef: ElementRef;
  linksEl: HTMLElement;
  nodesEl: HTMLElement;
  svg: HTMLElement;
  selectedAtomIds: Array<number>;
  simulation: any;
  constructor() {
    this.selectedAtomIds = [];
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['nodes']) {
      this.nodes = Utils.updateModels(
        (changes['nodes'].previousValue.length ?
            changes['nodes'].previousValue : []
        ),
        changes['nodes'].currentValue
      );
    }
    if (changes['links']) {
      this.links = Utils.updateModels(
        (changes['links'].previousValue.length ?
          changes['links'].previousValue : []),
        changes['links'].currentValue
      );
    }
    this.render();
  }

  ngAfterViewInit() {
    this.svg = this.svgElRef.nativeElement;
    this.linksEl = this.linksElRef.nativeElement;
    this.nodesEl = this.nodesElRef.nativeElement;
    this.render();
  }

  /**
   * Setup the force simulation and render the nodes and links.
   */
  render(): void {
    if (!this.svg || !this.linksEl || !this.nodesEl) { return; }
    this.simulation = forceSimulation()
      .force('link', forceLink()
        .distance(d => Utils.withDefault(d.distance, 20))
        .strength(d => Utils.withDefault(d.strength, 1.0))
      )
      .force('charge', forceManyBody())
      .force('center', forceCenter(250 / 2, 250 / 2));

    this.simulation
      .nodes(this.nodes)
      .on('tick', () => this.renderTransform());

    this.simulation.force('link')
      .id(d => d.id)
      .links(this.links);

    this.renderNodes();
    this.renderLinks();
  }

  /**
   * Renders the links based on their data attributes.
   */
  renderLinks(): void {
    const container = select(this.linksEl);
    const links = container.selectAll('.link')
      .data(this.links, d => d.id);
    const newLinksG = links.enter().append('g')
      .attr('class', 'link');

    // all edges (includes both bonds and distance constraints)
    newLinksG
      .append('line')
      .attr('class', 'link-line');
    container.selectAll('.link-line')
      .attr('source', d =>
        (typeof d.source.id !== 'undefined' ? d.source.id : d.source)
      )
      .attr('target', d =>
        (typeof d.target.id !== 'undefined' ? d.target.id : d.target)
      )
      .style('stroke-width', Utils.getBondWidth)
      .style('stroke-dasharray', (d) => (d.style === 'dashed' ? 5 : 0))
      .style('stroke', d => Utils.chooseColor(d, 'black'))
      .style('opacity', (d) => (d.bond !== 0 ? undefined : 0.0));

    // text placeholders for all edges
    newLinksG
      .append('text');
    container.selectAll('.link').selectAll('text')
      .attr('x', d => d.source.x || 0)
      .attr('y', d => d.source.y || 0)
      .attr('text-anchor', 'middle')
      .text(() => ' ');

    // double and triple bonds
    newLinksG
      .filter(d => d.bond > 1)
      .append('line')
      .attr('class', 'separator separator-double');
    container.selectAll('.separator-double')
      .style('stroke', '#FFF')
      .style('stroke-width', d => `${(d.bond * 4) - 5}px`);

    // triple bonds
    newLinksG
      .filter(d => d.bond === 3)
      .append('line')
      .attr('class', 'separator separator-triple');
    container.selectAll('.separator-triple')
      .style('stroke', d => Utils.chooseColor(d, 'black'))
      .style('stroke-width', () => Utils.getBondWidth(1));

    links.exit()
      .remove();
  }

  /**
   * Renders the nodes based on their data attributes.
   */
  renderNodes(): void {
    const container = select(this.nodesEl);
    const nodes = container.selectAll('.node')
      .data(this.nodes, d => d.id);
    const newNodesG = nodes.enter().append('g');

    newNodesG
      .attr('class', 'node')
      .on('click', this.onClickNode.bind(this))
      .attr('index', d => d.id);

    container.selectAll('.node')
      .classed('selected', d => (this.selectedAtomIds.indexOf(d.id) !== -1));

    const radius = scaleSqrt().range([0, 6]);

    // circle for each atom (background color white by default)
    newNodesG.append('circle')
      .attr('class', 'atom-circle')
      .attr('r', d => radius(Utils.withDefault(d.size, 1.5)))
      .style('fill', d => Utils.chooseColor(d, 'white'));

    // atom labels
    newNodesG.append('text')
      .attr('class', 'atom-label')
      .attr('dy', '.35em')
      .attr('text-anchor', 'middle')
      .text(d => d.atom);

    nodes.exit()
      .remove();
  }

  /**
   * Positions SVG elements on tick of the force simulation.
   */
  renderTransform(): void {
    if (!this.svg) { return; }
    const container = select(this.svg);
    // Nodes
    container.selectAll('.node')
      .attr('transform', d => `translate(${d.x || 0},${d.y || 0})`);

    // Links
    const links = container.selectAll('.link');

    // keep edges pinned to their nodes
    links.selectAll('line')
      .attr('x1', d => d.source.x || 0)
      .attr('y1', d => d.source.y || 0)
      .attr('x2', d => d.target.x || 0)
      .attr('y2', d => d.target.y || 0);

    // keep edge labels pinned to the edges
    links.selectAll('text')
      .attr('x', d => ((d.source.x || 0) + (d.target.x || 0)) / 2.0)
      .attr('y', d => ((d.source.y || 0) + (d.target.y || 0)) / 2.0);
  }

  /**
   * Adds or removes the id to the list of selected nodes, then re-renders
   * the nodes.
   * @param node - the node that was clicked
   */
  onClickNode(node): void {
    const selectedAtomIds = this.selectedAtomIds.slice(0);
    const index = selectedAtomIds.indexOf(node.id);
    if (index !== -1) {
      selectedAtomIds.splice(index, 1);
    } else {
      selectedAtomIds.push(node.id);
    }
    this.selectedAtomIds = selectedAtomIds;
    this.renderNodes();
    this.renderLinks();
  }
}
