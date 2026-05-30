import java.awt.*;
import java.awt.event.*;
import java.awt.geom.*;
import java.math.*;

public class PopupManager {
    Manager M;
    int X,Y;
    ListenSquare DOC,SHAPE,SLICE,TRIANG,EYE,PLATINUM,NEWTON,BUNDLE;
    
    /**This class allows you to open/kill other
       popup windows while the program is running*/

    public PopupManager(Manager m,int x,int y) {
	M=m;
	this.X=x;
	this.Y=y;
	DOC=new ListenSquare(X,Y,50,20);
	TRIANG=new ListenSquare(X,Y+20,50,20);
	EYE=new ListenSquare(X,Y+40,40,20);
	SLICE=new ListenSquare(X,Y+60,50,20);
	SHAPE=new ListenSquare(X,Y+80,50,20);
	PLATINUM=new ListenSquare(X,Y+100,50,20);
	NEWTON=new ListenSquare(X,Y+120,50,20);
	BUNDLE=new ListenSquare(X,Y+140,50,20);
    }


    public void render(Graphics2D g) {
	DOC.render(g,new Color(100,160,255),"instructions");
	SHAPE.render(g,new Color(200,0,200),"intrinsic");
	SLICE.render(g,new Color(255,180,255),"extrinsic");
	TRIANG.render(g,new Color(100,255,200),"triangulation");
	EYE.render(g,new Color(255,100,180),"eye");
      	NEWTON.render(g,new Color(120,150,190),"newton");
      	PLATINUM.render(g,new Color(255,180,0),"golden valley");
      	BUNDLE.render(g,new Color(50,255,50),"bundle");
    }

    public void process(Point X) {

	if(DOC.inside(X)==1) {
	    PopupDocumentCanvas PD=new PopupDocumentCanvas();
	    PD.D.M=this.M;
	    M.D=PD.D;
	    M.repaint();
	}

	if(SHAPE.inside(X)==1) {
	    PopupShapeCanvas PS=new PopupShapeCanvas();
	    PS.S.M=this.M;
	    M.S=PS.S;
	    M.repaint();
	}
	if(SLICE.inside(X)==1) {
	    PopupTorusCanvas PT=new PopupTorusCanvas();
	    PT.T.M=this.M;
	    M.T=PT.T;
	    M.repaint();
	}
	if(TRIANG.inside(X)==1) {
	    PopupPictureCanvas PP=new PopupPictureCanvas();
	    PP.P.M=this.M;
	    M.P=PP.P;
	    M.repaint();
	}
	if(EYE.inside(X)==1) {
	    PopupEyeCanvas PE=new PopupEyeCanvas();
	    PE.E.M=this.M;
	    M.E=PE.E;
	    M.repaint();
	}

	if(NEWTON.inside(X)==1) {
	     PopupNewtonCanvas PN=new PopupNewtonCanvas();
	     PN.N.M=this.M;
	     M.N=PN.N;
	     M.repaint();
	}

	if(PLATINUM.inside(X)==1) {
	     PopupGoldenCanvas PX=new PopupGoldenCanvas();
	     PX.X.M=this.M;
	     M.X=PX.X;
	     M.repaint();
	}
	
	if(BUNDLE.inside(X)==1) {
	     PopupBundleCanvas PZ=new PopupBundleCanvas();
	     PZ.Z.M=this.M;
	     M.Z=PZ.Z;
	     M.repaint();
	}
    }

}

