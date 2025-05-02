import jwt from 'jsonwebtoken'; // Import the default object
const { sign, verify } = jwt; 
const createTokens = (user) => {
    const accessToken = sign(
        {name:user.name, userId: user._id },
        "jwtsecretplschange"
    );
    return accessToken;
};

const validateToken = (req, res, next) => {
    const accessToken = req.cookies["access-token"];
    if (!accessToken) return res.status(400).json({ error: "User not authenticated!" });

    try {
        const validToken = verify(accessToken, "jwtsecretplschange");
        if (validToken) {
            req.name = validToken.name;
            req.userId = validToken.userId;  // Attach userId to the request object
            return next();
        }
    } catch (err) {
        return res.status(400).json({ error: err });
    }
};


export { createTokens, validateToken };
