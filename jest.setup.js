require("@testing-library/jest-dom");

// Mock TextEncoder/TextDecoder
global.TextEncoder = class {
  encode(text) {
    return Buffer.from(text);
  }
};

global.TextDecoder = class {
  decode(value) {
    if (!value) return "";
    return Buffer.from(value).toString();
  }
};

// Mock ReadableStream
class MockReadableStream {
  constructor(content) {
    this.content = content;
    this.reader = null;
  }

  getReader() {
    if (this.reader) {
      throw new Error("Reader already in use");
    }

    let content = this.content;
    let done = false;

    this.reader = {
      async read() {
        if (done) {
          return { done: true, value: undefined };
        }
        done = true;
        return {
          done: false,
          value: new TextEncoder().encode(
            typeof content === "string" ? content : JSON.stringify(content)
          ),
        };
      },
      releaseLock: () => {
        this.reader = null;
      },
    };

    return this.reader;
  }
}

// Mock Response with proper ReadableStream implementation
global.Response = class Response {
  constructor(body, init = {}) {
    this.body = new MockReadableStream(body);
    this.init = init;
    this.ok = true;
    this._bodyText = body;
  }

  async json() {
    return typeof this._bodyText === "string"
      ? JSON.parse(this._bodyText)
      : this._bodyText;
  }

  async text() {
    return typeof this._bodyText === "string"
      ? this._bodyText
      : JSON.stringify(this._bodyText);
  }
};
