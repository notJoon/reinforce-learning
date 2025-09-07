{
  description = "Q-learning TypeScript package with Nix";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        
        nodePackages = with pkgs; [
          nodejs_20
          nodePackages.typescript
          nodePackages.ts-node
          nodePackages.npm
        ];
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = nodePackages;
          
          shellHook = ''
            echo "Q-learning development environment"
            echo "Node.js: $(node --version)"
            echo "TypeScript: $(tsc --version)"
            echo ""
            echo "Available commands:"
            echo "  npm run build     - Build TypeScript files"
            echo "  npm run example:knight - Run Knight's Tour example"
            
            # Install npm dependencies if node_modules doesn't exist
            if [ ! -d "node_modules" ]; then
              echo "Installing npm dependencies..."
              npm install
            fi
          '';
        };
        
        packages.default = pkgs.stdenv.mkDerivation {
          pname = "qlearn-lite";
          version = "0.1.0";
          
          src = ./.;
          
          buildInputs = nodePackages;
          
          buildPhase = ''
            npm ci --production=false
            npm run build
          '';
          
          installPhase = ''
            mkdir -p $out
            cp -r dist $out/
            cp package.json $out/
            cp -r node_modules $out/
          '';
        };
      });
}
