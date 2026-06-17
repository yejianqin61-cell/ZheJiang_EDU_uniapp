// Mock pdfjs-dist for test environment (no native canvas dependency)
module.exports = {
  getDocument: jest.fn().mockReturnValue({
    promise: {
      numPages: 1,
      getPage: jest.fn().mockResolvedValue({
        getViewport: jest.fn().mockReturnValue({ height: 800, width: 600 }),
        getOperatorList: jest.fn().mockResolvedValue({ fnArray: [], argsArray: [] }),
        objs: { get: jest.fn().mockResolvedValue(null) },
      }),
    },
  }),
  OPS: {
    paintImageXObject: 85,
    paintInlineImageXObject: 86,
    paintImageMaskXObject: 87,
  },
}
