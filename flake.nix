{
  description = "csvs - comma-separated value store";

  inputs = { nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable"; };

  outputs = inputs@{ self, nixpkgs, ... }:
    let
      eachSystem = systems: f:
        let
          op = attrs: system:
            let
              ret = f system;
              op = attrs: key:
                let
                  appendSystem = key: system: ret: { ${system} = ret.${key}; };
                in attrs // {
                  ${key} = (attrs.${key} or { })
                    // (appendSystem key system ret);
                };
            in builtins.foldl' op attrs (builtins.attrNames ret);
        in builtins.foldl' op { } systems;
      defaultSystems = [
        "aarch64-linux"
        "aarch64-darwin"
        "i686-linux"
        "x86_64-darwin"
        "x86_64-linux"
      ];
    in eachSystem defaultSystems (system:
      let
        pkgs = import nixpkgs { inherit system; };
        csvs-js = pkgs.mkYarnPackage rec {
          name = "csvs-js";
          src = ./.;
          configurePhase = ''
            cp -r $node_modules node_modules
            chmod -R 755 node_modules
          '';
          buildPhase = ''
            yarn run build
            cp -r dist $out
          '';
          dontInstall = true;
          distPhase = ''
            true
          '';
        };
      in rec {
        devShell =
          pkgs.mkShell { buildInputs = with pkgs; [ nodejs-16_x yarn ]; };
        packages = { inherit csvs-js; };
        defaultPackage = csvs-js;
      });
}
