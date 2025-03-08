// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title WWEMonad
 * @dev Smart contract for WWE wrestling game on Monad blockchain
 * Records player actions and mints championship trophies as NFTs
 */
contract WWEMonad is ERC1155, Ownable {
    using Strings for uint256;
    
    // Constants
    uint256 public constant CHAMPIONSHIP_TROPHY = 1;
    uint256 private nextTokenId = 2;
    
    // Token URI for metadata
    string private baseURI;
    
    // Mapping of player addresses to their stats
    mapping(address => PlayerStats) public playerStats;
    
    // Player stats structure
    struct PlayerStats {
        uint256 totalMoves;
        uint256 specialMoves;
        uint256 grapples;
        uint256 ropeBounces;
        uint256 knockouts;
        uint256 championships;
        uint256 lastAction;
    }
    
    // Event for logging player actions
    event ActionLogged(address indexed player, string action);
    
    // Event for new trophy minted
    event TrophyMinted(address indexed player, uint256 tokenId);
    
    /**
     * @dev Initialize the contract with a base URI for metadata
     */
    constructor() ERC1155("") Ownable(msg.sender) {
        baseURI = "ipfs://QmTrophyMetadata/";
    }
    
    /**
     * @dev Set the base URI for token metadata
     * @param _newBaseURI New base URI
     */
    function setBaseURI(string memory _newBaseURI) external onlyOwner {
        baseURI = _newBaseURI;
    }
    
    /**
     * @dev Get the URI for a token
     * @param _id Token ID
     * @return Token URI string
     */
    function uri(uint256 _id) public view override returns (string memory) {
        return string(abi.encodePacked(baseURI, _id.toString(), ".json"));
    }
    
    /**
     * @dev Log a player action
     * @param action JSON string with action details
     */
    function logAction(string memory action) external {
        // Parse action type from JSON (simplified - in production would use a proper parser)
        bool isMove = _contains(action, "move");
        bool isSpecialMove = _contains(action, "special_move");
        bool isGrapple = _contains(action, "grapple");
        bool isRopeBounce = _contains(action, "rope_bounce");
        bool isKnockout = _contains(action, "knockout");
        bool isChampionship = _contains(action, "championship");
        
        // Update player stats based on action type
        if (isMove) {
            playerStats[msg.sender].totalMoves++;
        } else if (isSpecialMove) {
            playerStats[msg.sender].specialMoves++;
        } else if (isGrapple) {
            playerStats[msg.sender].grapples++;
        } else if (isRopeBounce) {
            playerStats[msg.sender].ropeBounces++;
        } else if (isKnockout) {
            playerStats[msg.sender].knockouts++;
        } else if (isChampionship) {
            playerStats[msg.sender].championships++;
        }
        
        // Update last action timestamp
        playerStats[msg.sender].lastAction = block.timestamp;
        
        // Emit action event
        emit ActionLogged(msg.sender, action);
    }
    
    /**
     * @dev Mint a championship trophy for a player
     * @param winner Address of the championship winner
     */
    function mintTrophy(address winner) external {
        // Only the contract owner or the player themselves can mint their trophy
        require(msg.sender == owner() || msg.sender == winner, "Not authorized to mint trophy");
        
        // Mint a championship trophy
        _mint(winner, CHAMPIONSHIP_TROPHY, 1, "");
        
        // Increment player's championship count
        playerStats[winner].championships++;
        
        // Emit trophy minted event
        emit TrophyMinted(winner, CHAMPIONSHIP_TROPHY);
    }
    
    /**
     * @dev Mint a new type of trophy (only owner)
     * @param to Recipient address
     * @param amount Number of tokens to mint
     */
    function mintNewTrophy(address to, uint256 amount) external onlyOwner {
        uint256 tokenId = nextTokenId;
        nextTokenId++;
        
        _mint(to, tokenId, amount, "");
        
        // Emit trophy minted event
        emit TrophyMinted(to, tokenId);
    }
    
    /**
     * @dev Get all stats for a player
     * @param player Address of the player
     * @return PlayerStats structure with all player stats
     */
    function getPlayerStats(address player) external view returns (PlayerStats memory) {
        return playerStats[player];
    }
    
    /**
     * @dev Simple helper to check if a string contains a substring
     * @param source Source string
     * @param searchFor String to search for
     * @return True if the source contains the search string
     */
    function _contains(string memory source, string memory searchFor) private pure returns (bool) {
        bytes memory sourceBytes = bytes(source);
        bytes memory searchBytes = bytes(searchFor);
        
        // If search string is longer than source, it cannot be contained
        if (searchBytes.length > sourceBytes.length) {
            return false;
        }
        
        // Simple naive search algorithm
        for (uint i = 0; i <= sourceBytes.length - searchBytes.length; i++) {
            bool found = true;
            for (uint j = 0; j < searchBytes.length; j++) {
                if (sourceBytes[i + j] != searchBytes[j]) {
                    found = false;
                    break;
                }
            }
            if (found) {
                return true;
            }
        }
        
        return false;
    }
} 