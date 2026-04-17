/**
 * Universal (Isomorphic) Logger for Observability
 * Works in both Node.js Backend and Browser Frontend contexts.
 */

type LogLevel = "INFO" | "WARN" | "ERROR" | "AUDIT" | "DEBUG";

interface LogPayload {
  timestamp: string;
  level: LogLevel;
  component: string;
  action: string;
  details?: Record<string, any>;
  environment: "client" | "server";
}

class UniversalLogger {
  private isBrowser: boolean;

  constructor() {
    this.isBrowser = typeof window !== "undefined";
  }

  private formatBrowserConsole(payload: LogPayload) {
    const { level, component, action, details, timestamp } = payload;
    let color = "#3b82f6"; // INFO: blue

    switch (level) {
      case "WARN":
        color = "#eab308"; // yellow
        break;
      case "ERROR":
        color = "#ef4444"; // red
        break;
      case "AUDIT":
        color = "#10b981"; // green
        break;
      case "DEBUG":
        color = "#6b7280"; // gray
        break;
    }

    const badge = `%c[${level}]`;
    const styles = `color: white; background-color: ${color}; padding: 2px 4px; border-radius: 4px; font-weight: bold;`;
    
    const prefix = `[${timestamp}] [${component}] ${action} -`;

    if (details) {
      console.log(`${badge} ${prefix}`, styles, details);
    } else {
      console.log(`${badge} ${prefix}`, styles);
    }
  }

  private formatServerConsole(payload: LogPayload) {
    // Standard structured JSON string easily ingestible by Datadog, ELK, etc.
    const jsonStr = JSON.stringify(payload);
    
    switch(payload.level) {
      case "ERROR":
        console.error(jsonStr);
        break;
      case "WARN":
        console.warn(jsonStr);
        break;
      case "INFO":
      case "AUDIT":
      case "DEBUG":
      default:
        console.log(jsonStr);
        break;
    }
  }

  private writeLog(level: LogLevel, component: string, action: string, details?: Record<string, any>) {
    const payload: LogPayload = {
      timestamp: new Date().toISOString(),
      level,
      component,
      action,
      details,
      environment: this.isBrowser ? "client" : "server",
    };

    if (this.isBrowser) {
      this.formatBrowserConsole(payload);
    } else {
      this.formatServerConsole(payload);
    }
  }

  public info(component: string, action: string, details?: Record<string, any>) {
    this.writeLog("INFO", component, action, details);
  }

  public warn(component: string, action: string, details?: Record<string, any>) {
    this.writeLog("WARN", component, action, details);
  }

  public error(component: string, action: string, details?: Record<string, any>) {
    // If details contains an Error object, extract message and stack
    let extractedDetails = details;
    if (details && details.error instanceof Error) {
      extractedDetails = {
        ...details,
        errorMessage: details.error.message,
        errorStack: details.error.stack,
      };
    }
    this.writeLog("ERROR", component, action, extractedDetails);
  }

  public audit(component: string, action: string, details?: Record<string, any>) {
    this.writeLog("AUDIT", component, action, details);
  }

  public debug(component: string, action: string, details?: Record<string, any>) {
    // In production, you might want to suppress DEBUG logs
    if (process.env.NODE_ENV !== "production") {
      this.writeLog("DEBUG", component, action, details);
    }
  }
}

export const logger = new UniversalLogger();
