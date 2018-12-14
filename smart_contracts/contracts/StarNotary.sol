pragma solidity ^0.4.23;

import 'openzeppelin-solidity/contracts/token/ERC721/ERC721.sol';

contract StarNotary is ERC721 { 

    event ForSale(        
        uint256 indexed tokenId,
        uint256 indexed price
    );

    struct Star {
        string name;
        string starStory;
        string ra;
        string dec;
        string mag;
    }

    mapping(uint256 => Star) public tokenIdToStarInfo; 
    mapping(uint256 => uint256) public starsForSale;
    mapping(bytes32 => uint256) internal starHashToToken;

    function createStar(string _name, string _story, string _ra, string _dec, string _mag, uint256 _tokenId) public { 
        Star memory newStar = Star({name: _name, starStory: _story, ra: _ra, dec: _dec, mag: _mag}); 

        require(bytes(_name).length > 0, "_name cannot be blank.");
        
        bytes memory storyBytes = bytes(_story); 
        bytes memory raBytes = bytes(_ra); 
        bytes memory decBytes = bytes(_dec); 
        bytes memory magBytes = bytes(_mag); 

        require(storyBytes.length > 0 && storyBytes.length <= 255, "_starStory cannot be blank and cannot be more than 255 characters.");        
        require(raBytes.length > 0, "_ra cannot be blank.");
        require(decBytes.length > 0, "_dec cannot be blank.");
        require(magBytes.length > 0, "_mag cannot be blank."); 

        bytes32 starHash = createStarHash(raBytes, decBytes, magBytes);        

        require(checkIfStarExists(starHash)==false, "A star with that location already exists. Star locations must be unique.");

        starHashToToken[starHash] = _tokenId;

        tokenIdToStarInfo[_tokenId] = newStar;       

        _mint(msg.sender, _tokenId);
    }

    function putStarUpForSale(uint256 _tokenId, uint256 _price) public { 
        require(_isApprovedOrOwner(msg.sender, _tokenId), "Only the owner or approved account can put the star up for sale.");

        starsForSale[_tokenId] = _price;

        emit ForSale(_tokenId, _price);
    }

    function buyStar(uint256 _tokenId) public payable { 
        require(starsForSale[_tokenId] > 0, "_tokenId cannot be empty or zero.");
        
        uint256 starCost = starsForSale[_tokenId];        
        require(msg.value >= starCost, "The value provided must be greater than the star Cost.");

        address starOwner = this.ownerOf(_tokenId);
        _removeTokenFrom(starOwner, _tokenId);
        _addTokenTo(msg.sender, _tokenId);
        
        starOwner.transfer(starCost);

        if(msg.value > starCost) { 
            msg.sender.transfer(msg.value - starCost);
        }
    }

    function checkIfStarExists(string _ra, string _dec, string _mag) public view returns(bool){
        bytes memory raBytes = bytes(_ra); 
        bytes memory decBytes = bytes(_dec); 
        bytes memory magBytes = bytes(_mag);         
        return checkIfStarExists(raBytes, decBytes, magBytes);
    }

    function checkIfStarExists(bytes _ra, bytes _dec, bytes _mag) internal view returns(bool){
        bytes32 starHash = createStarHash(_ra, _dec, _mag); 
        return checkIfStarExists(starHash);
    }

    function checkIfStarExists(bytes32 _starHash) internal view returns(bool){        
        if(starHashToToken[_starHash] == 0) {
            return false;
        }
        else {
            return true;        
        }
    }    

    function createStarHash(bytes raBytes, bytes decBytes, bytes magBytes) internal pure returns (bytes32) {

        string memory idString = new string(9 + raBytes.length + decBytes.length + magBytes.length); 
        bytes memory idBytes = bytes(idString);        
        
        string memory separator = "---";
        bytes memory separatorBytes = bytes(separator);

        uint k = 0;
        for (uint i = 0; i < separatorBytes.length; i++) idBytes[k++] = separatorBytes[i]; 
        for (i = 0; i < raBytes.length; i++) idBytes[k++] = raBytes[i];         
        for (i = 0; i < separatorBytes.length; i++) idBytes[k++] = separatorBytes[i]; 
        for (i = 0; i < decBytes.length; i++) idBytes[k++] = decBytes[i]; 
        for (i = 0; i < separatorBytes.length; i++) idBytes[k++] = separatorBytes[i]; 
        for (i = 0; i < magBytes.length; i++) idBytes[k++] = magBytes[i]; 

        return keccak256(idBytes);
    }
}