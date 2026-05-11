/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/exira.json`.
 */
export type Exira = {
  "address": "J7z1a2bwMEC8MchgZwskJZ8PzXg4UG674VgD8DuotJn2",
  "metadata": {
    "name": "exira",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Exira: savings-backed efficiency financing on Solana"
  },
  "instructions": [
    {
      "name": "activateProject",
      "discriminator": [
        237,
        96,
        65,
        148,
        226,
        140,
        89,
        15
      ],
      "accounts": [
        {
          "name": "platform",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  116,
                  102,
                  111,
                  114,
                  109
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "platform"
          ]
        },
        {
          "name": "project",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  106,
                  101,
                  99,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "project.project_id",
                "account": "project"
              }
            ]
          }
        },
        {
          "name": "usdcVault",
          "writable": true,
          "relations": [
            "project"
          ]
        },
        {
          "name": "treasuryUsdcAta",
          "docs": [
            "Treasury USDC ATA receiving the origination fee."
          ],
          "writable": true
        },
        {
          "name": "treasury",
          "relations": [
            "platform"
          ]
        },
        {
          "name": "usdcMint",
          "relations": [
            "platform"
          ]
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "addAuditor",
      "discriminator": [
        99,
        220,
        174,
        12,
        223,
        118,
        87,
        240
      ],
      "accounts": [
        {
          "name": "platform",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  116,
                  102,
                  111,
                  114,
                  109
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "relations": [
            "platform"
          ]
        },
        {
          "name": "auditorWallet",
          "docs": [
            "The auditor's wallet that will be authorized."
          ]
        },
        {
          "name": "auditor",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  100,
                  105,
                  116,
                  111,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "auditorWallet"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "certification",
          "type": "string"
        }
      ]
    },
    {
      "name": "addProjectToPool",
      "discriminator": [
        232,
        187,
        67,
        5,
        66,
        48,
        220,
        18
      ],
      "accounts": [
        {
          "name": "platform",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  116,
                  102,
                  111,
                  114,
                  109
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "relations": [
            "platform"
          ]
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "pool.pool_id",
                "account": "pool"
              }
            ]
          }
        },
        {
          "name": "project",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  106,
                  101,
                  99,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "project.project_id",
                "account": "project"
              }
            ]
          }
        },
        {
          "name": "poolProjectLink",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  108,
                  105,
                  110,
                  107
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "project"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "attestVerification",
      "discriminator": [
        174,
        250,
        164,
        34,
        215,
        158,
        186,
        134
      ],
      "accounts": [
        {
          "name": "auditorSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "auditor",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  100,
                  105,
                  116,
                  111,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "auditorSigner"
              }
            ]
          }
        },
        {
          "name": "mrvProject",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  114,
                  118,
                  95,
                  112,
                  114,
                  111,
                  106,
                  101,
                  99,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "mrv_project.project_id",
                "account": "mrvProject"
              }
            ]
          }
        },
        {
          "name": "verification",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "buyPoolTokens",
      "discriminator": [
        116,
        183,
        137,
        17,
        100,
        253,
        78,
        28
      ],
      "accounts": [
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "pool.pool_id",
                "account": "pool"
              }
            ]
          }
        },
        {
          "name": "poolTokenMint",
          "writable": true,
          "relations": [
            "pool"
          ]
        },
        {
          "name": "usdcVault",
          "writable": true,
          "relations": [
            "pool"
          ]
        },
        {
          "name": "investor",
          "writable": true,
          "signer": true
        },
        {
          "name": "investorUsdcAta",
          "writable": true
        },
        {
          "name": "investorPoolTokenAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "investor"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "poolTokenMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "investor"
              }
            ]
          }
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "buyProjectTokens",
      "discriminator": [
        129,
        229,
        96,
        8,
        73,
        41,
        6,
        21
      ],
      "accounts": [
        {
          "name": "project",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  106,
                  101,
                  99,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "project.project_id",
                "account": "project"
              }
            ]
          }
        },
        {
          "name": "tokenMint",
          "writable": true,
          "relations": [
            "project"
          ]
        },
        {
          "name": "usdcVault",
          "writable": true,
          "relations": [
            "project"
          ]
        },
        {
          "name": "investor",
          "writable": true,
          "signer": true
        },
        {
          "name": "investorUsdcAta",
          "docs": [
            "Investor's USDC ATA (source of USDC payment)"
          ],
          "writable": true
        },
        {
          "name": "investorTokenAta",
          "docs": [
            "Investor's project token ATA (destination of minted tokens)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "investor"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "tokenMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "project"
              },
              {
                "kind": "account",
                "path": "investor"
              }
            ]
          }
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "claimPoolReturns",
      "discriminator": [
        197,
        107,
        218,
        63,
        63,
        171,
        69,
        233
      ],
      "accounts": [
        {
          "name": "pool",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "pool.pool_id",
                "account": "pool"
              }
            ]
          }
        },
        {
          "name": "usdcVault",
          "writable": true,
          "relations": [
            "pool"
          ]
        },
        {
          "name": "investor",
          "writable": true,
          "signer": true
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "investor"
              }
            ]
          }
        },
        {
          "name": "investorUsdcAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "investor"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": []
    },
    {
      "name": "claimProjectReturns",
      "discriminator": [
        193,
        210,
        192,
        172,
        65,
        78,
        49,
        208
      ],
      "accounts": [
        {
          "name": "project",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  106,
                  101,
                  99,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "project.project_id",
                "account": "project"
              }
            ]
          }
        },
        {
          "name": "usdcVault",
          "writable": true,
          "relations": [
            "project"
          ]
        },
        {
          "name": "investor",
          "writable": true,
          "signer": true
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "project"
              },
              {
                "kind": "account",
                "path": "investor"
              }
            ]
          }
        },
        {
          "name": "investorUsdcAta",
          "docs": [
            "Investor's USDC ATA (destination of claimed USDC). Created if needed."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "investor"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": []
    },
    {
      "name": "closeProject",
      "discriminator": [
        117,
        209,
        53,
        106,
        93,
        55,
        112,
        49
      ],
      "accounts": [
        {
          "name": "platform",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  116,
                  102,
                  111,
                  114,
                  109
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "platform"
          ]
        },
        {
          "name": "project",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  106,
                  101,
                  99,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "project.project_id",
                "account": "project"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "createPool",
      "discriminator": [
        233,
        146,
        209,
        142,
        207,
        104,
        64,
        188
      ],
      "accounts": [
        {
          "name": "platform",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  116,
                  102,
                  111,
                  114,
                  109
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "relations": [
            "platform"
          ]
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "poolId"
              }
            ]
          }
        },
        {
          "name": "poolTokenMint",
          "writable": true,
          "signer": true
        },
        {
          "name": "usdcVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "usdcMint",
          "relations": [
            "platform"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "poolId",
          "type": "u64"
        },
        {
          "name": "targetAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "createProject",
      "discriminator": [
        148,
        219,
        181,
        42,
        221,
        114,
        145,
        190
      ],
      "accounts": [
        {
          "name": "platform",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  116,
                  102,
                  111,
                  114,
                  109
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "relations": [
            "platform"
          ]
        },
        {
          "name": "mrvProject",
          "docs": [
            "Reference MRV project. Must already have baseline submitted."
          ]
        },
        {
          "name": "project",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  106,
                  101,
                  99,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "projectId"
              }
            ]
          }
        },
        {
          "name": "tokenMint",
          "docs": [
            "Project's fractional ownership SPL token. Mint authority = project PDA."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "usdcVault",
          "docs": [
            "USDC ATA owned by the project PDA (vault)."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "project"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "usdcMint",
          "relations": [
            "platform"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "projectId",
          "type": "u64"
        },
        {
          "name": "targetAmount",
          "type": "u64"
        },
        {
          "name": "termMonths",
          "type": "u8"
        }
      ]
    },
    {
      "name": "distributePoolReturns",
      "discriminator": [
        245,
        191,
        229,
        156,
        250,
        24,
        199,
        6
      ],
      "accounts": [
        {
          "name": "platform",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  116,
                  102,
                  111,
                  114,
                  109
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "relations": [
            "platform"
          ]
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "pool.pool_id",
                "account": "pool"
              }
            ]
          }
        },
        {
          "name": "adminUsdcAta",
          "docs": [
            "Source of funds for the pool distribution (admin's USDC ATA)."
          ],
          "writable": true
        },
        {
          "name": "usdcVault",
          "writable": true,
          "relations": [
            "pool"
          ]
        },
        {
          "name": "usdcMint",
          "relations": [
            "platform"
          ]
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "distributeRepayment",
      "discriminator": [
        243,
        242,
        227,
        72,
        21,
        48,
        220,
        42
      ],
      "accounts": [
        {
          "name": "platform",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  116,
                  102,
                  111,
                  114,
                  109
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "relations": [
            "platform"
          ]
        },
        {
          "name": "project",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  106,
                  101,
                  99,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "project.project_id",
                "account": "project"
              }
            ]
          }
        },
        {
          "name": "adminUsdcAta",
          "docs": [
            "Admin's USDC ATA sourcing the repayment funds."
          ],
          "writable": true
        },
        {
          "name": "usdcVault",
          "writable": true,
          "relations": [
            "project"
          ]
        },
        {
          "name": "usdcMint",
          "relations": [
            "platform"
          ]
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initializePlatform",
      "discriminator": [
        119,
        201,
        101,
        45,
        75,
        122,
        89,
        3
      ],
      "accounts": [
        {
          "name": "platform",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  116,
                  102,
                  111,
                  114,
                  109
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "docs": [
            "Admin who signs and pays. Becomes the platform authority."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "treasury"
        },
        {
          "name": "usdcMint",
          "docs": [
            "The official USDC mint we accept (Circle devnet/mainnet)."
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "originationFeeBps",
          "type": "u16"
        },
        {
          "name": "performanceFeeBps",
          "type": "u16"
        },
        {
          "name": "hurdleRateBps",
          "type": "u16"
        }
      ]
    },
    {
      "name": "registerMrvProject",
      "discriminator": [
        94,
        126,
        160,
        201,
        125,
        220,
        172,
        214
      ],
      "accounts": [
        {
          "name": "platform",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  116,
                  102,
                  111,
                  114,
                  109
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "relations": [
            "platform"
          ]
        },
        {
          "name": "mrvProject",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  114,
                  118,
                  95,
                  112,
                  114,
                  111,
                  106,
                  101,
                  99,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "projectId"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "projectId",
          "type": "u64"
        },
        {
          "name": "msmeName",
          "type": "string"
        },
        {
          "name": "sector",
          "type": "string"
        },
        {
          "name": "location",
          "type": "string"
        },
        {
          "name": "upgradeType",
          "type": "string"
        }
      ]
    },
    {
      "name": "submitBaseline",
      "discriminator": [
        124,
        73,
        164,
        76,
        61,
        35,
        105,
        107
      ],
      "accounts": [
        {
          "name": "auditorSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "auditor",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  100,
                  105,
                  116,
                  111,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "auditorSigner"
              }
            ]
          }
        },
        {
          "name": "mrvProject",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  114,
                  118,
                  95,
                  112,
                  114,
                  111,
                  106,
                  101,
                  99,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "mrv_project.project_id",
                "account": "mrvProject"
              }
            ]
          }
        },
        {
          "name": "baseline",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  97,
                  115,
                  101,
                  108,
                  105,
                  110,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "mrvProject"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "energyKwhPerYear",
          "type": "u64"
        },
        {
          "name": "fuelType",
          "type": "string"
        },
        {
          "name": "costInrPerYear",
          "type": "u64"
        },
        {
          "name": "co2TonsPerYearX100",
          "type": "u64"
        },
        {
          "name": "reportHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "submitVerification",
      "discriminator": [
        30,
        19,
        8,
        156,
        126,
        43,
        28,
        175
      ],
      "accounts": [
        {
          "name": "auditorSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "auditor",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  100,
                  105,
                  116,
                  111,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "auditorSigner"
              }
            ]
          }
        },
        {
          "name": "mrvProject",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  114,
                  118,
                  95,
                  112,
                  114,
                  111,
                  106,
                  101,
                  99,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "mrv_project.project_id",
                "account": "mrvProject"
              }
            ]
          }
        },
        {
          "name": "verification",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "index",
          "type": "u8"
        },
        {
          "name": "periodStart",
          "type": "i64"
        },
        {
          "name": "periodEnd",
          "type": "i64"
        },
        {
          "name": "energyKwhSaved",
          "type": "u64"
        },
        {
          "name": "costInrSaved",
          "type": "u64"
        },
        {
          "name": "co2TonsAvoidedX100",
          "type": "u64"
        },
        {
          "name": "savingsVsExpectedBps",
          "type": "u16"
        },
        {
          "name": "reportHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "withdrawInvestment",
      "discriminator": [
        157,
        158,
        101,
        11,
        240,
        193,
        192,
        92
      ],
      "accounts": [
        {
          "name": "project",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  106,
                  101,
                  99,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "project.project_id",
                "account": "project"
              }
            ]
          }
        },
        {
          "name": "tokenMint",
          "writable": true,
          "relations": [
            "project"
          ]
        },
        {
          "name": "usdcVault",
          "writable": true,
          "relations": [
            "project"
          ]
        },
        {
          "name": "investor",
          "writable": true,
          "signer": true
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "project"
              },
              {
                "kind": "account",
                "path": "investor"
              }
            ]
          }
        },
        {
          "name": "investorTokenAta",
          "writable": true
        },
        {
          "name": "investorUsdcAta",
          "writable": true
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "auditor",
      "discriminator": [
        163,
        185,
        74,
        35,
        129,
        30,
        235,
        28
      ]
    },
    {
      "name": "baseline",
      "discriminator": [
        253,
        82,
        53,
        107,
        104,
        82,
        37,
        77
      ]
    },
    {
      "name": "investorPosition",
      "discriminator": [
        145,
        143,
        236,
        150,
        229,
        40,
        195,
        88
      ]
    },
    {
      "name": "mrvProject",
      "discriminator": [
        93,
        75,
        190,
        79,
        171,
        147,
        62,
        189
      ]
    },
    {
      "name": "platform",
      "discriminator": [
        77,
        92,
        204,
        58,
        187,
        98,
        91,
        12
      ]
    },
    {
      "name": "pool",
      "discriminator": [
        241,
        154,
        109,
        4,
        17,
        177,
        109,
        188
      ]
    },
    {
      "name": "poolProjectLink",
      "discriminator": [
        162,
        147,
        47,
        80,
        80,
        108,
        48,
        178
      ]
    },
    {
      "name": "project",
      "discriminator": [
        205,
        168,
        189,
        202,
        181,
        247,
        142,
        19
      ]
    },
    {
      "name": "verification",
      "discriminator": [
        230,
        33,
        140,
        88,
        132,
        240,
        116,
        178
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "unauthorized",
      "msg": "Unauthorized signer for this instruction"
    },
    {
      "code": 6001,
      "name": "platformAlreadyInitialized",
      "msg": "Platform already initialized"
    },
    {
      "code": 6002,
      "name": "invalidUsdcMint",
      "msg": "Invalid USDC mint"
    },
    {
      "code": 6003,
      "name": "invalidFeeBps",
      "msg": "Fee basis points exceeds 10_000 (100%)"
    },
    {
      "code": 6004,
      "name": "invalidTargetAmount",
      "msg": "Target amount must be greater than zero"
    },
    {
      "code": 6005,
      "name": "invalidTermMonths",
      "msg": "Term months out of allowed range"
    },
    {
      "code": 6006,
      "name": "mrvBaselineMissing",
      "msg": "Referenced MRV project does not exist or has no baseline submitted"
    },
    {
      "code": 6007,
      "name": "duplicateId",
      "msg": "Project or pool ID already in use"
    },
    {
      "code": 6008,
      "name": "poolFull",
      "msg": "Pool is full; target amount reached"
    },
    {
      "code": 6009,
      "name": "notFunding",
      "msg": "Pool is not in Funding status"
    },
    {
      "code": 6010,
      "name": "notActiveOrRepaying",
      "msg": "Pool is not in Active or Repaying status"
    },
    {
      "code": 6011,
      "name": "notCompleted",
      "msg": "Pool is not Completed"
    },
    {
      "code": 6012,
      "name": "cannotWithdraw",
      "msg": "Cannot withdraw after activation"
    },
    {
      "code": 6013,
      "name": "notFullyFunded",
      "msg": "Pool has not reached target amount"
    },
    {
      "code": 6014,
      "name": "cannotCancelActive",
      "msg": "Cannot cancel after activation"
    },
    {
      "code": 6015,
      "name": "nothingToClaim",
      "msg": "Nothing to claim"
    },
    {
      "code": 6016,
      "name": "zeroAmount",
      "msg": "Zero amount not allowed"
    },
    {
      "code": 6017,
      "name": "noTokensSold",
      "msg": "No tokens sold yet; cannot distribute"
    },
    {
      "code": 6018,
      "name": "mathOverflow",
      "msg": "Arithmetic overflow in distribution math"
    },
    {
      "code": 6019,
      "name": "mathUnderflow",
      "msg": "Arithmetic underflow in distribution math"
    },
    {
      "code": 6020,
      "name": "insufficientVaultBalance",
      "msg": "Claim amount exceeds vault balance (invariant violation)"
    },
    {
      "code": 6021,
      "name": "auditorInactive",
      "msg": "Auditor is not authorized or inactive"
    },
    {
      "code": 6022,
      "name": "baselineAlreadySubmitted",
      "msg": "Baseline already submitted for this project"
    },
    {
      "code": 6023,
      "name": "invalidVerificationPeriod",
      "msg": "Verification period is invalid (end before start)"
    },
    {
      "code": 6024,
      "name": "alreadyAttested",
      "msg": "Verification already attested"
    },
    {
      "code": 6025,
      "name": "attestationAuditorMismatch",
      "msg": "Only the submitting auditor can attest their own verification"
    },
    {
      "code": 6026,
      "name": "poolTooManyProjects",
      "msg": "Pool has reached max underlying projects (V1 limit)"
    },
    {
      "code": 6027,
      "name": "projectAlreadyLinked",
      "msg": "Project already linked to this pool"
    },
    {
      "code": 6028,
      "name": "projectNotLinked",
      "msg": "Project is not linked to this pool"
    },
    {
      "code": 6029,
      "name": "wrongVault",
      "msg": "Wrong vault account provided"
    },
    {
      "code": 6030,
      "name": "wrongMint",
      "msg": "Wrong token mint provided"
    },
    {
      "code": 6031,
      "name": "wrongPlatform",
      "msg": "Wrong platform config"
    },
    {
      "code": 6032,
      "name": "stringTooLong",
      "msg": "String field exceeds maximum length"
    }
  ],
  "types": [
    {
      "name": "auditor",
      "docs": [
        "Registered auditor (BEE-certified etc). PDA seeds: [\"auditor\", wallet.key()]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          },
          {
            "name": "certification",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "isActive",
            "type": "bool"
          },
          {
            "name": "projectsAudited",
            "type": "u32"
          },
          {
            "name": "addedAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "baseline",
      "docs": [
        "Baseline (pre-retrofit) energy consumption for an MRV project.",
        "PDA seeds: [\"baseline\", mrv_project.key()]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mrvProject",
            "type": "pubkey"
          },
          {
            "name": "auditor",
            "type": "pubkey"
          },
          {
            "name": "energyKwhPerYear",
            "docs": [
              "Pre-retrofit annual energy consumption (kWh)"
            ],
            "type": "u64"
          },
          {
            "name": "fuelType",
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          },
          {
            "name": "costInrPerYear",
            "docs": [
              "Annual energy cost in paise (INR * 100) for precision"
            ],
            "type": "u64"
          },
          {
            "name": "co2TonsPerYearX100",
            "docs": [
              "Baseline CO2 emissions per year in tons, scaled x100"
            ],
            "type": "u64"
          },
          {
            "name": "reportHash",
            "docs": [
              "SHA-256 hash of the off-chain detailed baseline report"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "submittedAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "investorPosition",
      "docs": [
        "One investor's position in either a Project or a Pool (target_kind distinguishes).",
        "PDA seeds: [\"position\", target.key(), owner.key()]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "docs": [
              "Wallet that owns this position"
            ],
            "type": "pubkey"
          },
          {
            "name": "target",
            "docs": [
              "Either Project PDA or Pool PDA key"
            ],
            "type": "pubkey"
          },
          {
            "name": "tokensHeld",
            "docs": [
              "How many project/pool tokens this position represents"
            ],
            "type": "u64"
          },
          {
            "name": "lastClaimedPerToken",
            "docs": [
              "Dividend accumulator value at the time of the investor's last claim (or at buy-in)"
            ],
            "type": "u128"
          },
          {
            "name": "totalClaimed",
            "docs": [
              "Total USDC claimed across all claim events (accounting only)"
            ],
            "type": "u64"
          },
          {
            "name": "bump",
            "docs": [
              "Bump for this position PDA"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "mrvProject",
      "docs": [
        "MRV (Measurement, Reporting, Verification) project registry entry.",
        "PDA seeds: [\"mrv_project\", project_id.to_le_bytes()]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "projectId",
            "type": "u64"
          },
          {
            "name": "msmeName",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          },
          {
            "name": "sector",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "location",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          },
          {
            "name": "upgradeType",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "mrvProjectStatus"
              }
            }
          },
          {
            "name": "baselineSubmitted",
            "type": "bool"
          },
          {
            "name": "verificationCount",
            "type": "u8"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "mrvProjectStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "registered"
          },
          {
            "name": "baselineSubmitted"
          },
          {
            "name": "inProgress"
          },
          {
            "name": "completed"
          }
        ]
      }
    },
    {
      "name": "platform",
      "docs": [
        "Singleton platform config. PDA seeds: [\"platform\"]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "docs": [
              "Admin authority (controls all admin instructions)"
            ],
            "type": "pubkey"
          },
          {
            "name": "treasury",
            "docs": [
              "Treasury wallet that receives origination + performance fees"
            ],
            "type": "pubkey"
          },
          {
            "name": "usdcMint",
            "docs": [
              "Accepted USDC mint (Circle devnet/mainnet official mint)"
            ],
            "type": "pubkey"
          },
          {
            "name": "originationFeeBps",
            "docs": [
              "Origination fee charged at activate_project, in basis points (150 = 1.5%)"
            ],
            "type": "u16"
          },
          {
            "name": "performanceFeeBps",
            "docs": [
              "Performance fee on upside above hurdle, in basis points (3000 = 30%)"
            ],
            "type": "u16"
          },
          {
            "name": "hurdleRateBps",
            "docs": [
              "Hurdle rate — investors must earn this before carry kicks in, in basis points"
            ],
            "type": "u16"
          },
          {
            "name": "projectCount",
            "docs": [
              "Monotonic counter for project_id assignment"
            ],
            "type": "u64"
          },
          {
            "name": "poolCount",
            "docs": [
              "Monotonic counter for pool_id assignment"
            ],
            "type": "u64"
          },
          {
            "name": "bump",
            "docs": [
              "Bump for the platform PDA"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "pool",
      "docs": [
        "Index/pool aggregating multiple projects. PDA seeds: [\"pool\", pool_id.to_le_bytes()]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "poolId",
            "type": "u64"
          },
          {
            "name": "poolTokenMint",
            "docs": [
              "SPL mint for this pool's fractional (diversified) ownership tokens"
            ],
            "type": "pubkey"
          },
          {
            "name": "usdcVault",
            "docs": [
              "USDC ATA owned by this pool's PDA (receives payouts flowing up from projects)"
            ],
            "type": "pubkey"
          },
          {
            "name": "targetAmount",
            "docs": [
              "Max USDC raise target for pool tokens"
            ],
            "type": "u64"
          },
          {
            "name": "tokensSold",
            "docs": [
              "Pool tokens sold so far"
            ],
            "type": "u64"
          },
          {
            "name": "totalDistributed",
            "docs": [
              "Total USDC distributed to pool token holders (lifetime)"
            ],
            "type": "u64"
          },
          {
            "name": "cumulativeUsdcPerToken",
            "docs": [
              "Pull-based dividend accumulator at pool layer"
            ],
            "type": "u128"
          },
          {
            "name": "underlyingProjectCount",
            "docs": [
              "How many underlying projects this pool has linked"
            ],
            "type": "u16"
          },
          {
            "name": "status",
            "docs": [
              "Lifecycle status"
            ],
            "type": {
              "defined": {
                "name": "poolStatus"
              }
            }
          },
          {
            "name": "createdAt",
            "docs": [
              "Unix timestamp at creation"
            ],
            "type": "i64"
          },
          {
            "name": "bump",
            "docs": [
              "Bump for this pool PDA"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "poolProjectLink",
      "docs": [
        "Link between a pool and an underlying project.",
        "PDA seeds: [\"pool_link\", pool.key(), project.key()]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "project",
            "type": "pubkey"
          },
          {
            "name": "projectTokensHeld",
            "docs": [
              "How many project tokens this pool holds for this linked project"
            ],
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "poolStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "funding"
          },
          {
            "name": "active"
          },
          {
            "name": "distributing"
          },
          {
            "name": "completed"
          },
          {
            "name": "cancelled"
          }
        ]
      }
    },
    {
      "name": "project",
      "docs": [
        "MSME project being financed. PDA seeds: [\"project\", project_id.to_le_bytes()]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "projectId",
            "type": "u64"
          },
          {
            "name": "mrvProject",
            "docs": [
              "Link to the MrvProject account that carries baseline + verifications"
            ],
            "type": "pubkey"
          },
          {
            "name": "tokenMint",
            "docs": [
              "SPL mint for this project's fractional ownership tokens"
            ],
            "type": "pubkey"
          },
          {
            "name": "usdcVault",
            "docs": [
              "USDC ATA owned by this project's PDA"
            ],
            "type": "pubkey"
          },
          {
            "name": "targetAmount",
            "docs": [
              "Max USDC this project wants to raise (in smallest units). Also = max tokens to mint."
            ],
            "type": "u64"
          },
          {
            "name": "tokensSold",
            "docs": [
              "How much USDC has been raised (tokens sold count) so far"
            ],
            "type": "u64"
          },
          {
            "name": "totalDistributed",
            "docs": [
              "Total USDC distributed as repayments (lifetime)"
            ],
            "type": "u64"
          },
          {
            "name": "cumulativeUsdcPerToken",
            "docs": [
              "Pull-based dividend accumulator, scaled by PRECISION (1e12)"
            ],
            "type": "u128"
          },
          {
            "name": "termMonths",
            "docs": [
              "Repayment term in months"
            ],
            "type": "u8"
          },
          {
            "name": "status",
            "docs": [
              "Lifecycle status"
            ],
            "type": {
              "defined": {
                "name": "projectStatus"
              }
            }
          },
          {
            "name": "activatedAt",
            "docs": [
              "Unix timestamp at activation (0 if not yet active)"
            ],
            "type": "i64"
          },
          {
            "name": "createdAt",
            "docs": [
              "Unix timestamp at creation"
            ],
            "type": "i64"
          },
          {
            "name": "originationFeeCollected",
            "docs": [
              "Total origination fee collected at activation (1.5% of target)"
            ],
            "type": "u64"
          },
          {
            "name": "bump",
            "docs": [
              "Bump for this project PDA"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "projectStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "funding"
          },
          {
            "name": "active"
          },
          {
            "name": "repaying"
          },
          {
            "name": "completed"
          },
          {
            "name": "cancelled"
          }
        ]
      }
    },
    {
      "name": "verification",
      "docs": [
        "Post-retrofit measurement + verification for a period.",
        "PDA seeds: [\"verification\", mrv_project.key(), verification_index_le]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mrvProject",
            "type": "pubkey"
          },
          {
            "name": "auditor",
            "type": "pubkey"
          },
          {
            "name": "index",
            "type": "u8"
          },
          {
            "name": "periodStart",
            "type": "i64"
          },
          {
            "name": "periodEnd",
            "type": "i64"
          },
          {
            "name": "energyKwhSaved",
            "docs": [
              "Actual energy savings (kWh) measured in the period"
            ],
            "type": "u64"
          },
          {
            "name": "costInrSaved",
            "docs": [
              "Actual cost savings (paise) in the period"
            ],
            "type": "u64"
          },
          {
            "name": "co2TonsAvoidedX100",
            "docs": [
              "CO2 avoided (tons, scaled x100)"
            ],
            "type": "u64"
          },
          {
            "name": "savingsVsExpectedBps",
            "docs": [
              "Actual savings vs expected, in basis points (10000 = 100%)"
            ],
            "type": "u16"
          },
          {
            "name": "reportHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "attested",
            "docs": [
              "True once the submitting auditor has signed-off / attested"
            ],
            "type": "bool"
          },
          {
            "name": "submittedAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "auditorSeed",
      "type": "bytes",
      "value": "[97, 117, 100, 105, 116, 111, 114]"
    },
    {
      "name": "baselineSeed",
      "type": "bytes",
      "value": "[98, 97, 115, 101, 108, 105, 110, 101]"
    },
    {
      "name": "mrvProjectSeed",
      "type": "bytes",
      "value": "[109, 114, 118, 95, 112, 114, 111, 106, 101, 99, 116]"
    },
    {
      "name": "platformSeed",
      "type": "bytes",
      "value": "[112, 108, 97, 116, 102, 111, 114, 109]"
    },
    {
      "name": "poolLinkSeed",
      "type": "bytes",
      "value": "[112, 111, 111, 108, 95, 108, 105, 110, 107]"
    },
    {
      "name": "poolSeed",
      "type": "bytes",
      "value": "[112, 111, 111, 108]"
    },
    {
      "name": "positionSeed",
      "type": "bytes",
      "value": "[112, 111, 115, 105, 116, 105, 111, 110]"
    },
    {
      "name": "projectSeed",
      "type": "bytes",
      "value": "[112, 114, 111, 106, 101, 99, 116]"
    },
    {
      "name": "verificationSeed",
      "type": "bytes",
      "value": "[118, 101, 114, 105, 102, 105, 99, 97, 116, 105, 111, 110]"
    }
  ]
};
