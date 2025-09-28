const {
    validateObjectId,
    validateUserId,
    validateTrackName,
    validatePlaylist
} = require('../../middleware/validation');

// Mock request and response objects
const mockRequest = (params = {}, body = {}) => ({ params, body });
const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};
const mockNext = jest.fn();

describe('Validation Middleware', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('validateObjectId', () => {
        it('should pass with valid ObjectId', () => {
            const req = mockRequest({ id: '507f1f77bcf86cd799439011' });
            const res = mockResponse();
            const next = mockNext;

            validateObjectId(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should reject invalid ObjectId', () => {
            const req = mockRequest({ id: 'invalid-id' });
            const res = mockResponse();
            const next = mockNext;

            validateObjectId(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Invalid ID format' });
            expect(next).not.toHaveBeenCalled();
        });

        it('should pass when no id parameter exists', () => {
            const req = mockRequest({});
            const res = mockResponse();
            const next = mockNext;

            validateObjectId(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });
    });

    describe('validateUserId', () => {
        it('should pass with valid userId', () => {
            const req = mockRequest({ userId: 'validUser123' });
            const res = mockResponse();
            const next = mockNext;

            validateUserId(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(req.params.userId).toBe('validUser123');
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should reject missing userId', () => {
            const req = mockRequest({});
            const res = mockResponse();
            const next = mockNext;

            validateUserId(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Invalid user ID' });
            expect(next).not.toHaveBeenCalled();
        });

        it('should reject userId that is too long', () => {
            const req = mockRequest({ userId: 'a'.repeat(51) });
            const res = mockResponse();
            const next = mockNext;

            validateUserId(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Invalid user ID' });
            expect(next).not.toHaveBeenCalled();
        });

        it('should sanitize HTML tags from userId', () => {
            const req = mockRequest({ userId: '<b>test</b>' });
            const res = mockResponse();
            const next = mockNext;

            validateUserId(req, res, next);

            expect(next).toHaveBeenCalled();
            // Regular tags are removed but content is preserved
            expect(req.params.userId).toBe('test');
        });

        it('should completely remove dangerous script tags from userId', () => {
            const req = mockRequest({ userId: '<script>test</script>' });
            const res = mockResponse();
            const next = mockNext;

            validateUserId(req, res, next);

            expect(next).toHaveBeenCalled();
            // Script tags are completely removed for security (including content)
            expect(req.params.userId).toBe('');
        });
    });

    describe('validateTrackName', () => {
        it('should pass with valid track name', () => {
            const req = mockRequest({ trackName: 'My Favorite Song' });
            const res = mockResponse();
            const next = mockNext;

            validateTrackName(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(req.params.trackName).toBe('My Favorite Song');
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should reject track name that is too long', () => {
            const req = mockRequest({ trackName: 'a'.repeat(201) });
            const res = mockResponse();
            const next = mockNext;

            validateTrackName(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Invalid track name' });
            expect(next).not.toHaveBeenCalled();
        });

        it('should sanitize HTML tags from track name', () => {
            const req = mockRequest({ trackName: '<b>Bold Song</b>' });
            const res = mockResponse();
            const next = mockNext;

            validateTrackName(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(req.params.trackName).toBe('Bold Song');
        });
    });

    describe('validatePlaylist', () => {
        it('should pass with valid playlist data', () => {
            const req = mockRequest({}, {
                name: 'My Playlist',
                description: 'A great playlist',
                tracks: [
                    { name: 'Song 1', url: '/music/song1.mp3' }
                ]
            });
            const res = mockResponse();
            const next = mockNext;

            validatePlaylist(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should reject playlist without name', () => {
            const req = mockRequest({}, {
                description: 'A playlist without name',
                tracks: []
            });
            const res = mockResponse();
            const next = mockNext;

            validatePlaylist(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(next).not.toHaveBeenCalled();
        });

        it('should reject playlist with invalid tracks', () => {
            const req = mockRequest({}, {
                name: 'My Playlist',
                tracks: [
                    { title: 'Song 1' } // Missing required fields
                ]
            });
            const res = mockResponse();
            const next = mockNext;

            validatePlaylist(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(next).not.toHaveBeenCalled();
        });
    });
});