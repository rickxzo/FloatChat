import React, { useEffect, useState } from "react";

export function SandboxRunner({ code }: { code: string }) {
  const [output, setOutput] = useState<string>("Initializing Python environment...");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    
    const runPython = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log("Raw code received:", code);
        
        // Clean up the code
        let cleanedCode = code
          .replace(/```python\s*\n?/g, '')
          .replace(/```\s*$/g, '')
          .replace(/\\n/g, '\n')
          .replace(/\\t/g, '\t')
          .replace(/\\\\/g, '\\')
          .replace(/\\"/g, '"')
          .replace(/\\'/g, "'")
          .trim();
        
        console.log("Cleaned code:", cleanedCode);
        
        if (!cleanedCode) {
          throw new Error("No Python code provided");
        }
        
        // Check if Pyodide is available
        // @ts-ignore
        if (!window.loadPyodide) {
          throw new Error("Pyodide not loaded. Please refresh the page.");
        }

        setOutput("Loading Python environment...");
        
        // Load Pyodide
        // @ts-ignore
        const pyodide = await window.loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.1/full/",
        });

        if (!mounted) return;
        
        setOutput("Installing packages...");

        // Install required packages
        await pyodide.loadPackage("micropip");
        await pyodide.runPythonAsync(`
          import micropip
          await micropip.install(["matplotlib", "numpy"])
        `);

        if (!mounted) return;
        
        setOutput("Generating visualization...");

        // Enhanced wrapper code with better error handling and data validation
        const wrappedCode = `
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import io
import base64
import numpy as np
import traceback

def generate_chart():
    try:
        # Clear any previous plots
        plt.clf()
        plt.close('all')
        
        # Prevent plt.show() from clearing the figure
        original_show = plt.show
        def custom_show(*args, **kwargs):
            pass
        plt.show = custom_show

        # User code execution
        exec('''${cleanedCode.replace(/'/g, "\\'")}''', globals())
        
        # Restore original show function
        plt.show = original_show
        
        # Get the current figure
        fig = plt.gcf()
        
        # Check if figure has content
        has_content = False
        if fig.axes:
            for ax in fig.axes:
                if (hasattr(ax, 'has_data') and ax.has_data()) or \
                   ax.patches or ax.collections or ax.images or ax.texts or ax.lines:
                    has_content = True
                    break
        
        # If no content, create a default message
        if not has_content:
            plt.figure(figsize=(8, 6))
            plt.text(0.5, 0.5, 'Chart generated successfully!\\nBut no data was plotted.\\nCheck your plotting code.',
                     ha='center', va='center', fontsize=14, 
                     bbox=dict(boxstyle="round,pad=0.3", facecolor="lightblue"))
            plt.axis('off')
            fig = plt.gcf()

        # Save figure to base64
        buf = io.BytesIO()
        fig.savefig(buf, format="png", dpi=150, bbox_inches='tight',
                    facecolor='white', edgecolor='none', pad_inches=0.1)
        buf.seek(0)
        img_data = base64.b64encode(buf.read()).decode("utf-8")
        buf.close()
        plt.close(fig)
        
        return img_data

    except Exception as e:
        # Error visualization
        error_msg = str(e)
        plt.figure(figsize=(8, 6))
        plt.text(0.5, 0.7, "❌ Error generating plot:", 
                 ha="center", va="center", fontsize=14, fontweight='bold', color="red")
        plt.text(0.5, 0.5, error_msg[:100] + ("..." if len(error_msg) > 100 else ""),
                 ha="center", va="center", fontsize=10, color="darkred",
                 bbox=dict(boxstyle="round,pad=0.3", facecolor="mistyrose"))
        plt.text(0.5, 0.3, "Check your code syntax and data", 
                 ha="center", va="center", fontsize=10, color="gray")
        plt.axis("off")
        
        buf = io.BytesIO()
        plt.savefig(buf, format="png", dpi=150, bbox_inches="tight", facecolor="white")
        buf.seek(0)
        img_data = base64.b64encode(buf.read()).decode("utf-8")
        buf.close()
        plt.close()
        return img_data

# Generate the chart
result = generate_chart()
result
        `;

        console.log("Executing Python code...");
        const result = await pyodide.runPythonAsync(wrappedCode);

        if (!mounted) return;

        if (result) {
          console.log("Chart generated successfully");
          setOutput(`<img src="data:image/png;base64,${result}" alt="Generated Chart" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" />`);
        } else {
          setError("No output generated from Python code");
          setOutput("Failed to generate chart");
        }
        
        setIsLoading(false);
      } catch (err: any) {
        console.error("SandboxRunner error:", err);
        if (mounted) {
          setError(`Execution Error: ${err.message}`);
          setOutput(`Error: ${err.message}`);
          setIsLoading(false);
        }
      }
    };

    runPython();
    
    return () => {
      mounted = false;
    };
  }, [code]);

  return (
    <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl shadow-lg border border-blue-200">
      <div className="mb-2">
        <h3 className="text-lg font-semibold text-blue-800 flex items-center">
          📊 Visualization
          {isLoading && (
            <div className="ml-2 animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
          )}
        </h3>
      </div>
      
      {isLoading && (
        <div className="flex items-center space-x-2 text-blue-600 bg-blue-50 p-3 rounded-lg">
          <div className="animate-pulse">⚡</div>
          <span className="text-sm font-medium">{output}</span>
        </div>
      )}
      
      {error && (
        <div className="text-red-700 bg-red-50 p-4 rounded-lg border border-red-200">
          <details>
            <summary className="font-semibold cursor-pointer hover:text-red-800">
              🚨 Execution Error (Click to expand)
            </summary>
            <div className="mt-3 space-y-2">
              <div>
                <strong>Error:</strong>
                <pre className="mt-1 text-sm whitespace-pre-wrap font-mono bg-red-100 p-2 rounded">
                  {error}
                </pre>
              </div>
              <div>
                <strong>Code received:</strong>
                <pre className="mt-1 text-sm whitespace-pre-wrap font-mono bg-gray-100 p-2 rounded max-h-32 overflow-y-auto">
                  {code}
                </pre>
              </div>
            </div>
          </details>
        </div>
      )}
      
      {!isLoading && !error && (
        <div className="chart-container bg-white p-2 rounded-lg shadow-inner">
          <div dangerouslySetInnerHTML={{ __html: output }} />
        </div>
      )}
    </div>
  );
}