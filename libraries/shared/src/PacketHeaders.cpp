//
//  PacketHeaders.cpp
//  hifi
//
//  Created by Stephen Birarda on 6/28/13.
//  Copyright (c) 2013 HighFidelity, Inc. All rights reserved.
//

#include "PacketHeaders.h"

PACKET_VERSION versionForPacketType(PACKET_TYPE type) {
    switch (type) {
        default:
            return 0;
            break;
    }
}

bool packetVersionMatch(unsigned char* packetHeader) {
    // currently this just checks if the version in the packet matches our return from versionForPacketType
    // may need to be expanded in the future for types and versions that take > than 1 byte
    return packetHeader[1] == versionForPacketType(packetHeader[0]);
}

int populateTypeAndVersion(unsigned char* destinationHeader, PACKET_TYPE type) {
    destinationHeader[0] = type;
    destinationHeader[1] = versionForPacketType(type);
    
    // return the number of bytes written for pointer pushing
    return 2;
}

int numBytesForPacketType(const unsigned char* packetType) {
    if (packetType[0] == 255) {
        return 1 + numBytesForPacketType(packetType + 1);
    } else {
        return 1;
    }
}

int numBytesForPacketVersion(const unsigned char* packetVersion) {
    if (packetVersion[0] == 255) {
        return 1 + numBytesForPacketVersion(packetVersion + 1);
    } else {
        return 1;
    }
}

int numBytesForPacketHeader(unsigned char* packetHeader) {
    // int numBytesType = numBytesForPacketType(packetHeader);
    // return numBytesType + numBytesForPacketVersion(packetHeader + numBytesType);
    
    // currently this need not be dynamic - there are 2 bytes for each packet header
    return 2;
}