# Legacy shell.nix for non-flake users
{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    nodejs_20
    nodePackages.typescript
    nodePackages.ts-node
    nodePackages.npm
  ];
  
  shellHook = ''
    echo "Q-learning development environment (shell.nix)"
    echo "Node.js: $(node --version)"
    echo "TypeScript: $(tsc --version)"
    
    if [ ! -d "node_modules" ]; then
      echo "Installing npm dependencies..."
      npm install
    fi
  '';
}
