import { useEffect } from "react";
import * as d3 from "d3";

export function Chart() {
  useEffect(() => {
    async function fetchAndPlot() {
      try {
        const response = await fetch("http://127.0.0.1:5000/data");
        const json = await response.json();

        const data = json.data;
        const cols = json.cols;

        if (!data || data.length === 0) return;

        // Convert 2D array into array of objects
        const formatted = data.map((row: any) => {
          const obj: any = {};
          cols.forEach((col: string, i: number) => {
            obj[col] = row[i];
          });
          return obj;
        });

        const xKey = cols[0];
        const yKey = cols[1];

        d3.select("#chart").selectAll("*").remove();

        const width = 800;
        const height = 400;
        const margin = { top: 30, right: 30, bottom: 50, left: 60 };

        const svg = d3
          .select("#chart")
          .append("svg")
          .attr("width", width)
          .attr("height", height);

        const x = d3
          .scaleBand()
          .domain(formatted.map((d: any) => d[xKey]))
          .range([margin.left, width - margin.right])
          .padding(0.2);

        const y = d3
          .scaleLinear()
          .domain([0, d3.max(formatted, (d: any) => +d[yKey]) || 0])
          .nice()
          .range([height - margin.bottom, margin.top]);

        svg
          .append("g")
          .attr("transform", `translate(0,${height - margin.bottom})`)
          .call(d3.axisBottom(x));

        svg
          .append("g")
          .attr("transform", `translate(${margin.left},0)`)
          .call(d3.axisLeft(y));

        svg
          .selectAll("rect")
          .data(formatted)
          .enter()
          .append("rect")
          .attr("x", (d: any) => x(d[xKey])!)
          .attr("y", (d: any) => y(d[yKey])!)
          .attr("width", x.bandwidth())
          .attr("height", (d: any) => y(0) - y(d[yKey]))
          .attr("fill", "#4ECDC4");
      } catch (err) {
        console.error("Chart fetch error:", err);
      }
    }

    fetchAndPlot();
  }, []);

  return <div id="chart" className="p-4"></div>;
}
